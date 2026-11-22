SELECT 'CREATE DATABASE carteira_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'carteira_test')\gexec