# main.tf - Define solo los recursos para el FRONTEND (con Acceso Secreto)

# Configura el proveedor de AWS, especificando la región.
provider "aws" {
  region = var.aws_region
}

# --- DATOS AUXILIARES ---
data "aws_caller_identity" "current" {}

# Obtenemos la función que creamos manualmente para usar su ARN.
data "aws_cloudfront_function" "auth_function" {
  name  = "auth-at-edge" # El nombre que le diste a la función en la consola
  stage = "LIVE"         # Usamos la versión publicada (LIVE)
}


# --- RECURSOS PARA EL FRONTEND (S3 + CloudFront) ---

# 1. Bucket de S3 para alojar los archivos estáticos del frontend.
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = var.domain_name
}

# 2. Origin Access Control (OAC) para dar a CloudFront acceso seguro al bucket.
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.domain_name}-oac"
  description                       = "Origin Access Control para el bucket S3 del frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 3. Certificado SSL/TLS gratuito para nuestro dominio.
resource "aws_acm_certificate" "ssl_certificate" {
  domain_name       = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 4. Distribución de CloudFront (CDN) para el frontend.
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id                = "S3-${var.domain_name}"

    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = [var.domain_name, "www.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.domain_name}"

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # --- SECCIÓN AÑADIDA ---
    # Asociamos nuestra función de autenticación.
    # Se ejecutará en cada petición del visitante.
    function_association {
      event_type   = "viewer-request"
      function_arn = data.aws_cloudfront_function.auth_function.arn
    }
  }

  price_class = "PriceClass_100"

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

# 5. Política del bucket actualizada para permitir el acceso desde CloudFront a través del OAC.
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
          "AWS:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.cdn.id}"
        }
      }
    }]
  })
}


# --- DNS (Route 53) ---

# 6. Obtener la zona de DNS alojada para tu dominio.
data "aws_route53_zone" "primary" {
  name = var.domain_name
}

# 7. Crear los registros DNS para validar el certificado SSL.
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

# 8. Crear el registro 'A' para el dominio principal, apuntando a CloudFront.
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
