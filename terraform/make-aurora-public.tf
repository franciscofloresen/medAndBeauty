resource "aws_db_subnet_group" "aurora_public" {
  name       = "aurora-public-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "Aurora public subnet group"
  }
}

resource "aws_db_cluster" "aurora_public" {
  cluster_identifier      = "medandbeauty-aurora-public"
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
  vpc_security_group_ids = [aws_security_group.aurora_public.id]
  
  skip_final_snapshot = true
  
  tags = {
    Name = "medandbeauty-aurora-public"
  }
}

resource "aws_rds_cluster_instance" "aurora_public_instance" {
  identifier         = "medandbeauty-aurora-public-instance"
  cluster_identifier = aws_db_cluster.aurora_public.id
  instance_class     = "db.serverless"
  engine             = aws_db_cluster.aurora_public.engine
  engine_version     = aws_db_cluster.aurora_public.engine_version
  
  publicly_accessible = true
  
  tags = {
    Name = "medandbeauty-aurora-public-instance"
  }
}

resource "aws_security_group" "aurora_public" {
  name_prefix = "aurora-public-"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Público para App Runner
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "aurora-public-sg"
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

output "aurora_public_endpoint" {
  value = aws_db_cluster.aurora_public.endpoint
}
