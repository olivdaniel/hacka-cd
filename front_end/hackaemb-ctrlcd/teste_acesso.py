import os

import requests
from dotenv import load_dotenv


load_dotenv()

endpoint = os.getenv("EXPLAB_ENDPOINT")
api_key = os.getenv("EXPLAB_API_KEY")

if not endpoint:
    raise ValueError("EXPLAB_ENDPOINT não encontrado no arquivo .env")

if not api_key:
    raise ValueError("EXPLAB_API_KEY não encontrada no arquivo .env")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

print("Testando conexão com o Experimental Labs...")
print(f"Endpoint: {endpoint}")
print(f"Chave carregada: {api_key[:4]}...{api_key[-4:]}")
print()

try:
    resposta = requests.get(
        endpoint,
        headers=headers,
        timeout=30,
    )

    print("Status HTTP:", resposta.status_code)
    print("Content-Type:", resposta.headers.get("content-type"))
    print("Resposta:")
    print(resposta.text[:2000])

except requests.exceptions.SSLError as erro:
    print("Erro de certificado SSL:")
    print(erro)

except requests.exceptions.ConnectionError as erro:
    print("Não foi possível conectar")