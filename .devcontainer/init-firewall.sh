#!/bin/bash
# Cierra la red del contenedor: solo deja salir a los rangos de GitHub y a los
# dominios de /usr/local/etc/fabrica-allowed-domains.txt. Basado en el
# init-firewall.sh de referencia de Claude Code. Corre como root al arrancar
# (postStartCommand) y termina comprobando que example.com no responde. Solo
# entonces deja /run/fabrica-firewall-ok, que fabrica-backlog exige para correr
# con bypassPermissions.
set -euo pipefail
IFS=$'\n\t'

rm -f /run/fabrica-firewall-ok

# Las políticas, abiertas mientras se arma la lista; se cierran más abajo.
# `devcontainer up` sobre un contenedor que ya corre vuelve a correr este
# script, y con OUTPUT en DROP de la vez anterior no podría bajar los rangos.
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT
if command -v ip6tables >/dev/null 2>&1 && ip6tables -L >/dev/null 2>&1; then
  ip6tables -P INPUT ACCEPT
  ip6tables -P FORWARD ACCEPT
  ip6tables -P OUTPUT ACCEPT
fi

DOMAINS_FILE=/usr/local/etc/fabrica-allowed-domains.txt

# El DNS interno de Docker, antes de vaciar las reglas.
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

if [ -n "$DOCKER_DNS_RULES" ]; then
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
fi

# DNS solo a los resolvedores del contenedor: el puerto 53 abierto a cualquier
# IP era un canal para sacar datos. Sin SSH: git va por HTTPS con la sesión de
# gh.
resolvers=$(awk '$1 == "nameserver" && $2 ~ /^[0-9.]+$/ {print $2}' /etc/resolv.conf)
if [ -z "$resolvers" ]; then
  echo "ERROR: /etc/resolv.conf no trae un resolvedor IPv4" >&2
  exit 1
fi
for ns in $resolvers; do
  for proto in udp tcp; do
    iptables -A OUTPUT -p "$proto" -d "$ns" --dport 53 -j ACCEPT
    iptables -A INPUT -p "$proto" -s "$ns" --sport 53 -j ACCEPT
  done
done
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# IPv6 cerrado: la lista de permitidos es solo IPv4.
if command -v ip6tables >/dev/null 2>&1 && ip6tables -L >/dev/null 2>&1; then
  ip6tables -F
  ip6tables -A INPUT -i lo -j ACCEPT
  ip6tables -A OUTPUT -o lo -j ACCEPT
  ip6tables -P INPUT DROP
  ip6tables -P FORWARD DROP
  ip6tables -P OUTPUT DROP
elif [ -n "$(ip -6 route show default 2>/dev/null)" ]; then
  echo "ERROR: hay salida por IPv6 y no puedo cerrarla con ip6tables" >&2
  exit 1
fi

ipset create allowed-domains hash:net

echo "Rangos de GitHub..."
gh_ranges=$(curl -s --max-time 30 https://api.github.com/meta)
if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
  echo "ERROR: api.github.com/meta no trajo los rangos de GitHub" >&2
  exit 1
fi
while read -r cidr; do
  if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
    echo "ERROR: rango raro en api.github.com/meta: $cidr" >&2
    exit 1
  fi
  ipset add -exist allowed-domains "$cidr"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[] | select(contains(":") | not)' | aggregate -q)

# Un dominio que no resuelve se salta con un aviso: que uno esté caído no
# debe impedir arrancar. Las comprobaciones del final cubren lo esencial.
while read -r domain; do
  ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
  if [ -z "$ips" ]; then
    echo "⚠ $domain no resolvió: queda bloqueado" >&2
    continue
  fi
  while read -r ip; do
    [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]] || continue
    ipset add -exist allowed-domains "$ip"
  done <<<"$ips"
done < <(sed -e 's/#.*//' -e 's/[[:space:]]//g' "$DOMAINS_FILE" | grep -v '^$')

HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
  echo "ERROR: no encontré la IP del host" >&2
  exit 1
fi
HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

if curl --connect-timeout 5 -s https://example.com >/dev/null 2>&1; then
  echo "ERROR: el firewall deja salir a example.com" >&2
  exit 1
fi
for url in https://api.github.com/zen https://api.anthropic.com; do
  if ! curl --connect-timeout 5 -s -o /dev/null "$url"; then
    echo "ERROR: el firewall no deja salir a $url" >&2
    exit 1
  fi
done
echo "Firewall listo: example.com bloqueado, GitHub y Anthropic abiertos"
touch /run/fabrica-firewall-ok
