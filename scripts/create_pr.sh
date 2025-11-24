#!/usr/bin/env bash
#
# Script para criar um Pull Request entre dois commits específicos no repositório determinado.
#
# PRÉ-REQUISITOS:
# 1. 'gh' CLI deve estar instalado e autenticado.
# 2. O repositório deve estar configurado corretamente no GitHub.
# 3. Os commits especificados devem existir no repositório.
#
# USO:
# ./create_pr.sh <repository name (e.g., user/repo)> <previous-head-commit> <current-head-commit>

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
repo="$1" # Repository name (e.g., user/repo)
prev="$2" # Previous head commit
curr="$3" # Current head commit

if [[ -z "$repo" ]]; then
  echo "Repository name not specified."
  exit 1
fi
if [[ -z "$prev" ]]; then
  echo "Previous head commit not specified."
  exit 1
fi
if [[ -z "$curr" ]]; then
  echo "Current head commit not specified."
  exit 1
fi

log_status INFO "Cloning repository $repo..."

git clone "https://github.com/$repo" || { echo "Failed to clone repository $repo."; exit 1; }
log_status SUCCESS "Repository $repo cloned successfully."

log_status INFO "Setting pull request from $curr to $prev"

cd "$(basename "$repo")" || { echo "Failed to change directory to repository."; exit 1; }

log_status INFO "Creating branches for pull request..."

git checkout "$prev" || { echo "Failed to checkout to $prev."; exit 1; }
git switch -c previous || { echo "Failed to create and switch to branch 'previous'."; exit 1; }
git push --set-upstream origin previous || { echo "Failed to push branch 'previous' to origin."; exit 1; }
log_status SUCCESS "Branch 'previous' created and pushed."

git checkout "$curr" || { echo "Failed to checkout to $curr."; exit 1; }
git switch -c current || { echo "Failed to create and switch to branch 'current'."; exit 1; }
git push --set-upstream origin current || { echo "Failed to push branch 'current' to origin."; exit 1; }
log_status SUCCESS "Branch 'current' created and pushed."

log_status SUCCESS "Pull request branches 'previous' and 'current' have been set up successfully."
log_status INFO "Creating pull request..."

REPO_NAME="${repo##*/}"
if [[ -z "$REPO_NAME" ]]; then
  echo "Failed to get repository name."
  exit 1
fi

gh repo set-default "$repo" || { echo "Failed to set default repo."; exit 1; }
log_status SUCCESS "Default repository set to $repo."

gh pr create --base previous --head current --title "Current changes" --body "Pull request from $curr to $prev" || {
  echo "Failed to create pull request."
  exit 1
}
log_status SUCCESS "Pull request created successfully."

log_status INFO "Cleaning up local repository clone..."
cd ..
rm -rf "$(basename "$repo")" || { echo "Failed to remove local repository clone."; exit 1; }
log_status SUCCESS "Local repository clone removed."