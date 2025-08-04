# outputs.tf - Define los valores que Terraform mostrará después de ejecutarse

output "backend_ecr_repository_url" {
  description = "La URL del repositorio de ECR para la imagen del backend."
  value       = aws_ecr_repository.backend_repo.repository_url
}

output "app_runner_service_url" {
  description = "La URL del servicio de App Runner del backend."
  value       = aws_apprunner_service.backend_service.service_url
}

output "frontend_s3_bucket_name" {
  description = "El nombre del bucket de S3 que aloja el frontend."
  value       = aws_s3_bucket.frontend_bucket.id
}

output "cloudfront_distribution_url" {
  description = "La URL de la distribución de CloudFront para el frontend."
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}
