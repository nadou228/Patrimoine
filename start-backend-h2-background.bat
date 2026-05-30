@echo off
REM Base H2 en memoire (donnees vides a chaque demarrage) — dev uniquement.
cd /d "%~dp0"

set "JAVA_HOME=%~dp0jdk-21\jdk-21.0.6+7"
set "PATH=%JAVA_HOME%\bin;%~dp0maven\maven-3.9.14\bin;%PATH%"

call mvn.cmd spring-boot:run -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--spring.flyway.enabled=false > backend_h2_background.out.log 2> backend_h2_background.err.log
