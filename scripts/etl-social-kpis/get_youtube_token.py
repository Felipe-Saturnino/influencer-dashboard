"""
Script para obter o Refresh Token do YouTube (OAuth 2.0).
Rode uma vez e copie o refresh_token para o GitHub Secret YOUTUBE_REFRESH_TOKEN.

Uso:
    pip install google-auth-oauthlib
    python get_youtube_token.py "C:\caminho\para\client_secret_xxx.json"
"""

import sys
from pathlib import Path

SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def main():
    if len(sys.argv) < 2:
        secret_path = Path(__file__).parent / "client_secret.json"
        print(f"Uso: python get_youtube_token.py <caminho_do_client_secret.json>")
        print(f"Ou coloque client_secret.json nesta pasta e rode sem argumentos.")
        if not secret_path.exists():
            sys.exit(1)
    else:
        secret_path = Path(sys.argv[1])
        if not secret_path.exists():
            print(f"Arquivo não encontrado: {secret_path}")
            sys.exit(1)

    from google_auth_oauthlib.flow import InstalledAppFlow

    print("Iniciando fluxo OAuth... Uma janela do navegador será aberta.")
    flow = InstalledAppFlow.from_client_secrets_file(str(secret_path), SCOPES)
    creds = flow.run_local_server(port=0)

    if creds.refresh_token:
        print("\n" + "=" * 50)
        print("REFRESH_TOKEN (copie para YOUTUBE_REFRESH_TOKEN):")
        print("=" * 50)
        print(creds.refresh_token)
        print("=" * 50)
    else:
        print("Atenção: Nenhum refresh_token retornado. Tente revogar o acesso do app em")
        print("myaccount.google.com/permissions e rodar novamente.")


if __name__ == "__main__":
    main()
