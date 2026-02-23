import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables du fichier .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise Exception("❌ Variables d'environnement Supabase manquantes")

# Créer le client Supabase avec la service role key
supabase: Client = create_client(url, key)

def get_client():
    return supabase

print("✅ Connexion sécurisée à Supabase configurée !")
print("URL:", url)
print("KEY exists:", bool(key))