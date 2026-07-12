moved {
  from = module.network.aws_subnet.public
  to   = module.network.aws_subnet.public[0]
}

moved {
  from = module.network.aws_subnet.private_2
  to   = module.network.aws_subnet.private[1]
}

moved {
  from = module.network.aws_route_table_association.public
  to   = module.network.aws_route_table_association.public[0]
}

moved {
  from = module.network.aws_route_table_association.private_2
  to   = module.network.aws_route_table_association.private[1]
}

moved {
  from = module.security.aws_security_group.web
  to   = module.security.aws_security_group.alb
}
