#!/usr/bin/env bash
#
# Script para forkar um repositório no GitHub, instalar um GitHub App no repositório bifurcado e criar um Pull Request entre dois commits específicos.
#
# PRÉ-REQUISITOS:
# 1. 'curl', 'jq' e 'gh' CLI devem estar instalados.
# 2. A variável de ambiente GH_TOKEN deve estar definida (Token com escopo 'repo' e 'admin:repo_hook').
#
# USO (EXEMPLO, encadeado com install_app.sh e create_pr.sh):
# export GH_TOKEN="seu_token_aqui"
# ./execute_experiment.sh octocat/Spoon-Knife meu-app-de-teste github-app-client-id private-key-path previous-head-commit current-head-commit

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

# --- Verificação de Argumentos ---
if [ "$#" -ne 6 ]; then
    log_status ERROR "Número incorreto de argumentos."
    echo "USO: $0 <repositorio/origem> <slug-do-github-app> <client-id-do-github-app> <caminho-da-chave-privada> <previous-head-commit> <current-head-commit>" >&2
    exit 1
fi

SOURCE_REPO="$1"          # Repositório de origem (Ex: owner/repo)
APP_SLUG="$2"             # Slug do GitHub App (Ex: 'dependabot')
APP_CLIENT_ID="$3"        # Client ID do GitHub App
PRIVATE_KEY_PATH="$4"     # Caminho para a chave privada do GitHub App
PREV_COMMIT="$5"         # Commit anterior
CURR_COMMIT="$6"         # Commit atual

# --- 1. Fork do Repositório ---
log_status INFO "Forking repository $SOURCE_REPO..."
NEW_FORK=$(./fork_repo.sh "$SOURCE_REPO")
if [ $? -ne 0 ]; then
    log_status ERROR "Failed to fork repository $SOURCE_REPO."
    exit 1
fi
log_status SUCCESS "Repository forked successfully: $NEW_FORK"

# --- 2. Instalar o GitHub App no Repositório Bifurcado ---
log_status INFO "Installing GitHub App '$APP_SLUG' on repository $NEW_FORK..."
./install_app.sh "$NEW_FORK" "$APP_SLUG" "$APP_CLIENT_ID" "$PRIVATE_KEY_PATH"
if [ $? -ne 0 ]; then
    log_status ERROR "Failed to install GitHub App '$APP_SLUG' on repository $NEW_FORK."
    exit 1
fi
log_status SUCCESS "GitHub App '$APP_SLUG' installed successfully on repository $NEW_FORK."

# --- 3. Criar Pull Request entre os Commits Específicos ---
log_status INFO "Creating pull request from $CURR_COMMIT to $PREV_COMMIT in repository $NEW_FORK..."
./create_pr.sh "$NEW_FORK" "$PREV_COMMIT" "$CURR_COMMIT"
if [ $? -ne 0 ]; then
    log_status ERROR "Failed to create pull request in repository $NEW_FORK."
    exit 1
fi
log_status SUCCESS "Pull request created successfully in repository $NEW_FORK."

# --- Finalização ---
# procura o link do PR criado
PR_URL=$(gh pr list --repo "$NEW_FORK" --state open --json url --jq '.[0].url')
if [[ -z "$PR_URL" ]]; then
    log_status ERROR "Failed to retrieve the pull request URL."
    exit 1
fi

log_status SUCCESS "Experiment execution completed successfully. Pull Request can be found at $PR_URL"