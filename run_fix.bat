@echo off
set PGPASSWORD=patrimoine@patris0609
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U adm_patrimoine -d patris_togo -f fix_constraint.sql
echo Done: %ERRORLEVEL%
