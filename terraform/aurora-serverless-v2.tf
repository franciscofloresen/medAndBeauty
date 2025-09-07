resource "aws_rds_cluster" "aurora_serverless_v2" {
  cluster_identifier      = "medandbeauty-serverless-v2"
  engine                 = "aurora-mysql"
  engine_version         = "8.0.mysql_aurora.3.10.0"
  database_name          = "medandbeauty"
  master_username        = "admin"
  master_password        = "Poncho2001!"
  
  serverlessv2_scaling_configuration {
    max_capacity = 1
    min_capacity = 0.5
  }
  
  db_subnet_group_name   = aws_db_subnet_group.aurora_public.name
  vpc_security_group_ids = [aws_security_group.aurora_public_v2.id]
  
  skip_final_snapshot = true
  
  tags = {
    Name = "medandbeauty-serverless-v2"
  }
}

resource "aws_rds_cluster_instance" "aurora_serverless_v2_instance" {
  identifier         = "medandbeauty-serverless-v2-instance"
  cluster_identifier = aws_rds_cluster.aurora_serverless_v2.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora_serverless_v2.engine
  engine_version     = aws_rds_cluster.aurora_serverless_v2.engine_version
  
  publicly_accessible = true
  
  tags = {
    Name = "medandbeauty-serverless-v2-instance"
  }
}

resource "aws_security_group" "aurora_public_v2" {
  name_prefix = "aurora-serverless-v2-"
  vpc_id      = data.aws_vpc.default.id

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

  tags = {
    Name = "aurora-serverless-v2-sg"
  }
}

data "aws_vpc" "default" {
  default = true
}

output "aurora_serverless_v2_endpoint" {
  value = aws_rds_cluster.aurora_serverless_v2.endpoint
}
