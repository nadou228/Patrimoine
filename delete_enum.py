import os

enum_path = r'd:\MES_PROJET\gestion_biens\Patrimoine-\src\main\java\com\patris\enums\categorie.java'
if os.path.exists(enum_path):
    os.remove(enum_path)
    print("Enum categorie supprimé.")
else:
    print("Enum categorie non trouvé (déjà supprimé ou n'existait pas).")
