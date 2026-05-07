@echo off
findstr /i "BLOCKING RuntimeException ERREUR NullPointer Certification certifi" backend_final.log | tail -30
