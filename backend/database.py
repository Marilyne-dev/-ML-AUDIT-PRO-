import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables du fichier .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Créer le client Supabase
supabase: Client = create_client(url, key)

def get_client():
    return supabase

print("✅ Connexion à Supabase configurée !")