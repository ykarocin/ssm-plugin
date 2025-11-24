#!/bin/bash
#
# Adiciona o repositório fornecido à instalação existente de um GitHub App.
#
# PRÉ-REQUISITOS:
# 1. 'curl' e 'jq' devem estar instalados.
# 2. A variável de ambiente GH_TOKEN deve estar definida.
# 3. O GitHub App deve estar previamente instalado na conta.
#
# USO (EXEMPLO, encadeado com fork_repo.sh):
# NEW_FORK=$(./fork_repo.sh octocat/Spoon-Knife)
# ./install_app.sh $NEW_FORK meu-app-de-teste github-app-client-id private-key-path

# Função para registrar status
log_status() {
    LEVEL=$1
    MESSAGE=$2
    COLOR_INFO='\033[0;34m'
    COLOR_SUCCESS='\033[0;32m'
    COLOR_ERROR='\033[0;31m'
    COLOR_RESET='\033[0m'

    case $LEVEL in
        INFO) echo -e "${COLOR_INFO}[INFO]${COLOR_RESET} ${MESSAGE}" >&2 ;;
        SUCCESS) echo -e "${COLOR_SUCCESS}[SUCCESS]${COLOR_RESET} ${MESSAGE}" >&2 ;;
        ERROR) echo -e "${COLOR_ERROR}[ERROR]${COLOR_RESET} ${MESSAGE}" >&2 ;;
    esac
}

# --- Variáveis de Configuração ---
API_BASE="https://api.github.com"
NEW_REPO_PATH="$1" # Caminho do repositório a ser instalado (Ex: user/repo)
APP_SLUG="$2"      # Slug do GitHub App (Ex: 'dependabot')

# --- 1. Verificação de Argumentos e Pré-requisitos ---
if [ -z "${NEW_REPO_PATH}" ] || [ -z "${APP_SLUG}" ]; then
    log_status ERROR "Faltando argumentos."
    echo "USO: $0 <novo/repositorio/bifurcado> <slug-do-github-app>" >&2
    exit 1
fi

if [ -z "${GH_TOKEN}" ]; then
    log_status ERROR "GH_TOKEN não está definido. Exporte seu Token de Acesso Pessoal (PAT)."
    exit 1
fi

# Verifica o jq
if ! command -v jq &> /dev/null; then
    log_status ERROR "'jq' não está instalado. Instale 'jq' para processar JSON."
    exit 1
fi


# --- 2. Obter ID do Repositório (Necessário para a API de Instalação) ---
log_status INFO "Obtendo ID do repositório para ${NEW_REPO_PATH}..."
REPO_DETAILS=$(curl -s \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${API_BASE}/repos/${NEW_REPO_PATH}")

REPO_ID=$(echo "${REPO_DETAILS}" | jq -r '.id // empty')

if [ -z "${REPO_ID}" ] || [ "${REPO_ID}" = "null" ]; then
    log_status ERROR "Não foi possível obter o ID do repositório '${NEW_REPO_PATH}'. Verifique se ele existe e se seu token tem permissão."
    echo "${REPO_DETAILS}" | jq . >&2
    exit 1
fi

log_status SUCCESS "ID do Repositório: ${REPO_ID}"


# --- 3. Obter ID de Instalação do App ---
log_status INFO "Procurando o ID de instalação para o App com slug: ${APP_SLUG}..."

CLIENT_ID=$3 # Client ID do GitHub App como terceiro argumento
PRIVATE_KEY_PATH=$4 # Caminho do arquivo da chave privada como quarto argumento
APP_TOKEN=$(./generate_jwt.sh "${CLIENT_ID}" "${PRIVATE_KEY_PATH}")

log_status INFO "Buscando instalações do App..."

# Lista todas as instalações do App
INSTALLATIONS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${APP_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${API_BASE}/app/installations")

if echo "${INSTALLATIONS_RESPONSE}" | grep -q "\"message\": \"Not Found\""; then
    log_status ERROR "Falha ao obter instalações do App. Verifique o Client ID e a chave privada."
    echo "${INSTALLATIONS_RESPONSE}" | jq . >&2
    exit 1
fi

GITHUB_USER=$(echo "${NEW_REPO_PATH}" | cut -d'/' -f1)

log_status INFO "Procurando instalação do App para o usuário: ${GITHUB_USER}..."

# Filtra a instalação correta relacionada ao usuário
USER_INSTALLATION=$(echo "${INSTALLATIONS_RESPONSE}" | jq -r ".[] | select(.account.login == \"${GITHUB_USER}\")")

# Encontra o ID de instalação pelo slug do App
INSTALLATION_ID=$(echo "${USER_INSTALLATION}" | jq -r ".id // empty")
if [ -z "${INSTALLATION_ID}" ]; then
    log_status ERROR "Instalação do App '${APP_SLUG}' não encontrada na sua conta. Certifique-se de que ele está instalado."
    echo "Resposta completa das instalações:"
    echo "${INSTALLATIONS_RESPONSE}" | jq . >&2
    exit 1
fi

log_status SUCCESS "ID de Instalação encontrado: ${INSTALLATION_ID}"

# --- 4. Ativar o App no Novo Repositório (Adicionar à Instalação) ---
log_status INFO "Adicionando o repositório ${NEW_REPO_PATH} à instalação do App (ID: ${INSTALLATION_ID})."

# Envia a requisição POST para adicionar o repositório
ADD_REPO_RESPONSE=$(curl -s -X PUT \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  "${API_BASE}/user/installations/${INSTALLATION_ID}/repositories/${REPO_ID}")

# A API retorna "" em caso de sucesso
if [ -z "${ADD_REPO_RESPONSE}" ]; then
    log_status SUCCESS "Repositório '${NEW_REPO_PATH}' adicionado com sucesso à instalação do App. Instalação concluída!"
else
    log_status ERROR "Falha ao adicionar o repositório à instalação do App. Resposta da API:"
    echo "${ADD_REPO_RESPONSE}" | jq . >&2
    exit 1
fi

log_status INFO "🎉 Instalação concluída."
