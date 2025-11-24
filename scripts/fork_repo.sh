#!/bin/bash
#
# Script de automação GitHub: Bifurca um repositório.
#
# PRÉ-REQUISITOS:
# 1. 'curl' e 'jq' devem estar instalados.
# 2. A variável de ambiente GH_TOKEN deve estar definida (Token com escopo 'repo').
#
# USO (EXEMPLO):
# export GH_TOKEN="seu_token_aqui"
# chmod +x fork_repo.sh
# ./fork_repo.sh octocat/Spoon-Knife

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

# --- 1. Verificação de Argumentos e Pré-requisitos ---

# Verifica se o repositório de origem foi fornecido como argumento
if [ -z "$1" ]; then
    log_status ERROR "Faltando argumento: Repositório de origem (Ex: owner/repo)."
    echo ""
    echo "USO: $0 <repositorio/a/bifurcar>"
    echo "EXEMPLO: $0 octocat/Spoon-Knife"
    exit 1
fi

# --- Variáveis de Configuração ---
API_BASE="https://api.github.com"
SOURCE_REPO="$1" # Repositório a ser bifurcado (Recebido via argumento de linha de comando)
MAX_RETRIES=15
RETRY_DELAY=5 # Segundos

# Verifica o PAT
if [ -z "${GH_TOKEN}" ]; then
    log_status ERROR "GH_TOKEN não está definido. Por favor, exporte seu Token de Acesso Pessoal (PAT)."
    exit 1
fi

# Verifica o jq
if ! command -v jq &> /dev/null; then
    log_status ERROR "'jq' não está instalado. Instale 'jq' para processar JSON."
    exit 1
fi

# --- 2. Obter Nome de Usuário Autenticado ---
log_status INFO "Obtendo nome de usuário autenticado..."
USER_INFO=$(curl -s -H "Authorization: Bearer ${GH_TOKEN}" "${API_BASE}/user")
# Verifica se a chamada da API foi bem-sucedida e se 'login' existe
GITHUB_USER=$(echo "${USER_INFO}" | jq -r '.login // empty')

if [ -z "${GITHUB_USER}" ] || [ "${GITHUB_USER}" = "null" ]; then
    log_status ERROR "Falha ao obter o nome de usuário. O token pode ser inválido ou expirado."
    echo "${USER_INFO}" | jq .
    exit 1
fi

NEW_REPO_NAME_AUX=$(basename "${SOURCE_REPO}")
NEW_REPO_NAME="${NEW_REPO_NAME_AUX//.git/}"
NEW_REPO_PATH="${GITHUB_USER}/${NEW_REPO_NAME}"
log_status SUCCESS "Usuário autenticado: ${GITHUB_USER}. Novo repositório esperado: ${NEW_REPO_PATH}"

# --- 3. Bifurcar Repositório (Fork) ---
log_status INFO "Iniciando bifurcação de ${SOURCE_REPO}..."

SOURCE_REPO_OWNER=$(echo "${SOURCE_REPO}" | cut -d'/' -f4)
SOURCE_REPO_NAME_AUX=$(basename "${SOURCE_REPO}")
SOURCE_REPO_NAME="${SOURCE_REPO_NAME_AUX//.git/}"

FORK_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "${API_BASE}/repos/${SOURCE_REPO_OWNER}/${SOURCE_REPO_NAME}/forks")

# Verifica o código de status
FORK_STATUS_CODE=$(echo "${FORK_RESPONSE}" | head -n 1 | awk '{print $2}')

if [[ "${FORK_RESPONSE}" =~ "\"message\": \"Not Found\"" ]]; then
    log_status ERROR "Repositório de origem não encontrado: ${SOURCE_REPO}"
    exit 1
fi

if [[ "${FORK_RESPONSE}" =~ "\"message\": \"Forking is not enabled\"" ]]; then
    log_status ERROR "Bifurcação desativada para ${SOURCE_REPO}"
    exit 1
fi

if ! [[ "${FORK_RESPONSE}" =~ "\"full_name\"" ]]; then
    log_status ERROR "Falha ao iniciar a bifurcação. Resposta da API:"
    echo "${FORK_RESPONSE}" | jq .
    exit 1
fi

log_status SUCCESS "Bifurcação iniciada! Aguardando o novo repositório ficar disponível..."

# --- 4. Aguardar a Conclusão do Fork ---
for (( i=1; i<=MAX_RETRIES; i++ )); do
    log_status INFO "Tentativa ${i}/${MAX_RETRIES}: Verificando se o repositório ${NEW_REPO_PATH} existe..."
    
    # Tenta obter os detalhes do novo repositório
    REPO_DETAILS=$(curl -s \
        -H "Authorization: Bearer ${GH_TOKEN}" \
        -H "Accept: application/vnd.github+json" \
        "${API_BASE}/repos/${NEW_REPO_PATH}")
    
    # Verifica se a resposta contém 'id' (indicando que o repositório está pronto)
    REPO_ID=$(echo "${REPO_DETAILS}" | jq -r '.id // empty')

    if [ -n "${REPO_ID}" ] && [ "${REPO_ID}" != "null" ]; then
        log_status SUCCESS "Repositório bifurcado pronto em: https://github.com/${NEW_REPO_PATH}"
        # IMPRIME O RESULTADO PRINCIPAL PARA STDOUT
        echo "${NEW_REPO_PATH}"
        break
    fi

    if [ $i -eq $MAX_RETRIES ]; then
        log_status ERROR "Tempo limite esgotado (${MAX_RETRIES} tentativas) ao aguardar o repositório bifurcado."
        exit 1
    fi
    
    sleep ${RETRY_DELAY}
done
