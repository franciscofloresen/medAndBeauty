resource "aws_rds_cluster" "medandbeauty_aurora" {
  cluster_identifier = "medandbeauty-aurora"
  engine             = "aurora-mysql"
  engine_mode        = "provisioned"
  engine_version     = "8.0.mysql_aurora.3.10.0"  # Versión más reciente compatible con MySQL 8.0
  
  database_name   = "medandbeauty"
  master_username = "admin"
  master_password = "TuPasswordSeguro123!"  # Cambiar por tu password actual
  
  serverlessv2_scaling_configuration {
    max_capacity = 1
    min_capacity = 0.5
  }
  
  backup_retention_period = 1
  preferred_backup_window = "07:00-09:00"
  
  vpc_security_group_ids = [aws_security_group.aurora_sg.id]
  
  skip_final_snapshot = true
  deletion_protection = false
  
  tags = {
    Name = "medandbeauty-aurora"
  }
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  identifier         = "medandbeauty-aurora-instance"
  cluster_identifier = aws_rds_cluster.medandbeauty_aurora.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.medandbeauty_aurora.engine
  engine_version     = aws_rds_cluster.medandbeauty_aurora.engine_version
}

resource "aws_security_group" "aurora_sg" {
  name_prefix = "aurora-sg"
  
  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "aurora_endpoint" {
  value = aws_rds_cluster.medandbeauty_aurora.endpoint
}
