# outputs.tf - Define los valores que Terraform mostrará después de ejecutarse

output "frontend_s3_bucket_name" {
  description = "El nombre del bucket de S3 que aloja el frontend."
  value       = aws_s3_bucket.frontend_bucket.id
}

output "cloudfront_distribution_url" {
  description = "La URL de la distribución de CloudFront para el frontend."
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}
