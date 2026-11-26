# Contenedor desechable para correr los workers de la fábrica con
# bypassPermissions: sin preguntas, pero con la red cerrada salvo lo de
# allowed-domains.txt. Basado en el dev container de referencia de Claude Code
# (github.com/anthropics/claude-code/tree/main/.devcontainer). Lo escribió
# fabrica-devcontainer; es del proyecto, edítalo si hace falta.
FROM node:24-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
  git \
  jq \
  sudo \
  less \
  procps \
  curl \
  ca-certificates \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  fontconfig \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# gh del repositorio de GitHub: el de Debian bookworm es 2.23.0, de 2023.
RUN install -d -m 0755 /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# pnpm, el de packageManager en package.json. Si cambias esa versión, cambia
# PNPM_VERSION y reconstruye.
ARG PNPM_VERSION=12.23.0
RUN npm install -g pnpm@${PNPM_VERSION}
# Su caché va en un volumen (devcontainer.json): el proyecto está en otro
# sistema de archivos, y pnpm la dejaba dentro de la carpeta del proyecto.
RUN mkdir -p /home/node/.local/share/pnpm-store \
  && chown -R node:node /home/node/.local

# Playwright: Chromium y sus librerías de sistema van en la imagen, que se
# construye con la red abierta. Dentro, el firewall no deja usar apt ni bajar
# Chromium. Si el proyecto cambia de versión de @playwright/test, cambia
# PLAYWRIGHT_VERSION y reconstruye: cada versión busca su propio Chromium.
ARG PLAYWRIGHT_VERSION=1.65.1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium \
  && chmod -R a+rX /ms-playwright \
  && rm -rf /var/lib/apt/lists/*

ENV DEVCONTAINER=true

# Suavizado de letras por subpíxel, como en Ubuntu, el sistema del runner de
# la CI: sin esto, las capturas del contenedor salían ~1% distintas en el
# borde de cada letra, y la línea base visual no servía para comparar aquí.
RUN ln -sf /usr/share/fontconfig/conf.avail/10-sub-pixel-rgb.conf /etc/fonts/conf.d/10-sub-pixel-rgb.conf

# git entra a GitHub con la sesión de gh (en un volumen), también al clonar el
# plugin privado. En el sistema y no en ~/.gitconfig, que no sobrevive a una
# reconstrucción.
RUN git config --system credential.https://github.com.helper '!gh auth git-credential'

RUN mkdir -p /home/node/.claude /home/node/.config/gh \
  && chown -R node:node /home/node/.claude /home/node/.config

# Como root, en /usr/local/bin: Debian reinicia el PATH en las shells de login
# (las de VS Code y el CLI de dev containers), y un prefijo de npm propio se
# perdía. La versión va fija y las actualizaciones apagadas en
# devcontainer.json: para subir de versión, cambia CLAUDE_CODE_VERSION y
# reconstruye.
ARG CLAUDE_CODE_VERSION=2.1.319
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# La lista de dominios va dentro de la imagen, de root: si el firewall la
# leyera del proyecto, el agente podría agrandarla y volver a correrlo.
COPY allowed-domains.txt /usr/local/etc/fabrica-allowed-domains.txt
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod 0755 /usr/local/bin/init-firewall.sh \
  && chmod 0644 /usr/local/etc/fabrica-allowed-domains.txt \
  && echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall \
  && chmod 0440 /etc/sudoers.d/node-firewall

USER node
