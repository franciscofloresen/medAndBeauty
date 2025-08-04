# variables.tf - Define las variables de entrada para nuestra configuración

variable "aws_region" {
  description = "La región de AWS donde se desplegarán los recursos."
  type        = string
  default     = "us-east-1" # Cambia esto a tu región preferida
}

variable "project_name" {
  description = "Un nombre para el proyecto, usado para nombrar recursos."
  type        = string
  default     = "medandbeauty"
}

variable "domain_name" {
  description = "Tu nombre de dominio comprado (ej. mi-tienda.com)."
  type        = string
  # IMPORTANTE: Reemplaza esto con tu dominio real.
  default     = "tu-dominio.com"
}

variable "ssm_parameter_path" {
  description = "La ruta base para los secretos en Parameter Store."
  type        = string
  default     = "/medandbeauty"
}
