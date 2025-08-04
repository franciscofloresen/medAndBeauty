# main.tf - Define todos los recursos de AWS

# Configura el proveedor de AWS, especificando la región.
provider "aws" {
  region = var.aws_region
}

# --- RECURSOS PARA EL BACKEND (AWS App Runner) ---

# 1. Repositorio de Contenedores (ECR) para almacenar la imagen de Docker del backend.
resource "aws_ecr_repository" "backend_repo" {
  name                 = "${var.project_name}-backend-repo"
  image_tag_mutability = "MUTABLE" # Permite sobrescribir tags de imagen (ej. 'latest')

  image_scanning_configuration {
    scan_on_push = true
  }
}

# 2. Rol de IAM que App Runner usará para acceder a otros servicios de AWS.
# En este caso, para poder leer los secretos de Parameter Store.
resource "aws_iam_role" "app_runner_secrets_role" {
  name = "${var.project_name}-app-runner-secrets-role"

  # Política que permite a App Runner asumir este rol.
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = {
        Service = "tasks.apprunner.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

# 3. Política de IAM que concede permiso para leer los secretos.
resource "aws_iam_policy" "secrets_policy" {
  name        = "${var.project_name}-secrets-access-policy"
  description = "Permite acceso a los parámetros de Parameter Store para la app"

  # El ARN está construido para dar acceso a TODOS los parámetros bajo la ruta /medandbeauty/
  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = "ssm:GetParameters",
      Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/*"
    }]
  })
}

# 4. Adjuntar la política de acceso a secretos al rol de App Runner.
resource "aws_iam_role_policy_attachment" "secrets_attach" {
  role       = aws_iam_role.app_runner_secrets_role.name
  policy_arn = aws_iam_policy.secrets_policy.arn
}

# 5. Servicio de AWS App Runner que ejecutará nuestro backend.
resource "aws_apprunner_service" "backend_service" {
  service_name = "${var.project_name}-backend-service"

  # Define el origen del código: nuestra imagen en ECR.
  source_configuration {
    image_repository {
      image_identifier      = "${aws_ecr_repository.backend_repo.repository_url}:latest"
      image_repository_type = "ECR"

      # Configuración del puerto y las variables de entorno.
      image_configuration {
        port = "3001" # El puerto que expone el Dockerfile
        # Aquí está la magia: pasamos los secretos de Parameter Store como variables de entorno a la aplicación.
        runtime_environment_secrets = {
          DB_HOST          = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/DB_HOST"
          DB_USER          = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/DB_USER"
          DB_PASSWORD      = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/DB_PASSWORD"
          DB_DATABASE      = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/DB_DATABASE"
          JWT_SECRET       = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/JWT_SECRET"
          GEMINI_API_KEY   = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/GEMINI_API_KEY"
          PINECONE_API_KEY = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_path}/PINECONE_API_KEY"
        }
      }
    }
    # App Runner necesita un rol para acceder a ECR.
    # El rol 'ecsTaskExecutionRole' es un rol administrado por AWS que ya tiene los permisos necesarios.
    authentication_configuration {
      access_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/apprunner.amazonaws.com/AWSServiceRoleForAppRunner"
    }
  }

  # Rol para que la instancia acceda a otros servicios (Parameter Store en nuestro caso).
  instance_configuration {
    instance_role_arn = aws_iam_role.app_runner_secrets_role.arn
  }

  # Configuración de salud para que App Runner sepa si la app está funcionando.
  health_check_configuration {
    protocol = "TCP"
    path     = "/"
  }
}

# --- RECURSOS PARA EL FRONTEND (S3 + CloudFront) ---

# 6. Bucket de S3 para alojar los archivos estáticos del frontend.
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = var.domain_name # El nombre del bucket debe ser igual al dominio

  # Habilita el alojamiento de sitios web estáticos.
  website {
    index_document = "index.html"
    error_document = "index.html" # Redirige errores a index.html (bueno para SPAs)
  }
}

# 7. Política del bucket para permitir que CloudFront acceda a los archivos.
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = {
        Service = "cloudfront.amazonaws.com"
      },
      Action   = "s3:GetObject",
      Resource = "${aws_s3_bucket.frontend_bucket.arn}/*",
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
        }
      }
    }]
  })
}

# 8. Certificado SSL/TLS gratuito para nuestro dominio.
resource "aws_acm_certificate" "ssl_certificate" {
  domain_name       = var.domain_name
  # También incluimos el subdominio de la API y el www.
  subject_alternative_names = ["api.${var.domain_name}", "www.${var.domain_name}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 9. Distribución de CloudFront (CDN) para el frontend.
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id   = "S3-${var.domain_name}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Alias para el dominio principal y el www.
  aliases = [var.domain_name, "www.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.domain_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100" # La opción más barata (Norteamérica y Europa)

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.ssl_certificate.arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# --- DNS (Route 53) ---

# 10. Obtener la zona de DNS alojada para tu dominio (debe existir en Route 53).
data "aws_route53_zone" "primary" {
  name = var.domain_name
}

# 11. Crear los registros DNS para validar el certificado SSL.
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.ssl_certificate.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      record  = dvo.resource_record_value
      type    = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary.zone_id
}

# 12. Crear el registro 'A' para el dominio principal, apuntando a CloudFront.
resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# 13. Crear el registro 'CNAME' para la API, apuntando a App Runner.
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "api"
  type    = "CNAME"
  ttl     = 300
  records = [aws_apprunner_service.backend_service.service_url]
}

# --- DATOS AUXILIARES ---

# Obtener el ID de la cuenta de AWS actual para construir ARNs.
data "aws_caller_identity" "current" {}

