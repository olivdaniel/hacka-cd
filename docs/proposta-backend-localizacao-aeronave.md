# Proposta: localização da peça na aeronave no back-end

Data: 24/09/2026.

**Status: proposta, não implementada.** A seção 22 da especificação pede este documento "somente depois que o visualizador estiver funcional" e proíbe implementá-lo "sem nova autorização". Nenhum arquivo do back-end foi alterado.

**Legenda:**
- **[F]** fonte: código ou especificação lidos;
- **[I]** inferência;
- **[D]** decisão proposta;
- **[AD]** A DEFINIR.

## 1. Situação atual

- **Back-end [F]** (`fastapi_app.py` + `user_api.py`, SQLite `users.sqlite3`):
  - trata só de autenticação e de usuários (`/api/auth/*`, `/api/users/*`);
  - não existe endpoint de registro de não conformidade;
  - o esqueleto .NET (`src/Portal.*`) tem as pastas de domínio vazias.
- **Front-end CTRL+CD [F]:**
  - não faz chamadas de rede;
  - o registro (`S.rec`) fica no `localStorage`, como rascunho e histórico por conta;
  - as fotos ficam em IndexedDB.
- **Localização (Fases 6 e 7) [F]:**
  - `regionSelected` (texto) e `aircraftLocation` (estruturada) ficam em `S.rec`;
  - a captura fica em IndexedDB (`ctrlcd-aircraft-location`);
  - nada sai do navegador.

**Consequência [I]:** para gravar a localização no servidor, é preciso antes existir uma API de registros de NC. Esta proposta descreve só a parte da localização e supõe um recurso `/api/nc-records/{id}`, que também é [AD].

## 2. Contrato de dados (versão 1)

```jsonc
// dentro do registro de NC: campo "aircraftLocation"
{
  "schema": "ctrlcd.aircraft-location/1",          // versionamento explícito [D]
  "aircraftModel": "E195-E2-demonstrativo",        // enum; hoje só o modelo demonstrativo
  "source": "3d",                                   // "3d" | "2d"
  "label": "Asa esquerda · Bordo de ataque",        // = regionSelected (compatibilidade)
  "locationIds": ["wing_left", "wing_left_leading_edge"],
  "partial": false,
  "confirmed": true,
  "confirmedBy": "user",                            // nunca "system": nada é identificado automaticamente
  "confirmedAt": "2026-09-24T07:00:45Z",            // [D] novo; o servidor registra
  "currentView": "top",
  "defectPosition": {                               // só com source = "3d"
    "regionId": "slat_left",
    "meshRegionId": "wing_left",
    "meshName": "wing_left",
    "worldPosition": [20.6519, -0.0696, 7.7595],    // metros; X a partir do nariz, Y para cima, Z positivo à esquerda
    "localPosition": [20.6519, -0.0696, 7.7595],
    "surfaceNormal": [0.08, 0.99, -0.09],
    "referenceView": "top",
    "confirmed": true
  },
  "approximatePoint": {                             // só com source = "2d"
    "view": "top", "regionId": "wing_left_trailing_edge", "svg": [325.4, 543.8],
    "longitudinal_m": 22.94, "lateral_m": -8.73, "confirmed": true
  },
  "snapshot": { "id": "…", "mime": "image/jpeg", "width": 808, "height": 738, "bytes": 61440, "sha256": "…" },
  "modelRef": { "glbSha256": "86db982c…5169", "hierarchyVersion": "87-regioes/1" }   // [D] rastreabilidade
}
```

**Campos que precisam de decisão [AD]:**
- `confirmedAt` (horário do servidor ou do cliente);
- `modelRef` (recomendado: sem ele, coordenadas antigas perdem o significado se o GLB mudar).

## 3. Payload e endpoints propostos [D]

| Operação | Método e rota | Corpo | Observação |
|---|---|---|---|
| Gravar ou atualizar a localização | `PUT /api/nc-records/{id}/aircraft-location` | JSON acima, sem a imagem | idempotente; `If-Match` com a versão do registro |
| Enviar a captura | `PUT /api/nc-records/{id}/aircraft-location/snapshot` | `image/jpeg` (binário) | separado do JSON para não inflar o registro; devolve `id` e `sha256` |
| Ler | `GET /api/nc-records/{id}/aircraft-location` | — | devolve o JSON; a imagem vai por URL assinada ou rota autenticada |
| Remover | `DELETE /api/nc-records/{id}/aircraft-location` | — | quando o usuário troca para "não instalada na aeronave" |

Autenticação e permissões seguem `docs/permissions.md` [F]. Esta proposta não define novos papéis.

## 4. Validação no servidor [D]

1. **Versão:** `schema` precisa ser uma versão conhecida. Versão desconhecida → 422.
2. **Hierarquia:** `locationIds` deve formar uma cadeia válida na hierarquia de 87 regiões: cada item é filho do anterior, e o primeiro é filho de `aircraft`.
   - O servidor deve ter a mesma fonte única, gerada de `aircraft-hierarchy.js` ou de `regions_spec.py`.
3. **Texto:** `label` deve ser igual aos rótulos de `locationIds` unidos por " · ". Caso contrário, o servidor recalcula o texto.
4. **Flag `partial`:** `partial = false` exige `defectPosition` ou `approximatePoint` com `confirmed = true`.
5. **Números:**
   - finitos e dentro da caixa envolvente do modelo, mais 5 % (caixa do GLB: X 0 a 41,63 m; Y −3,60 a 6,86 m; Z −17,56 a 17,56 m [F]; com a margem: X −2,1 a 43,7; Y −4,1 a 7,4; Z −19,3 a 19,3);
   - normal unitária, com tolerância de 1e-3;
   - no máximo 4 casas decimais.
6. **Coerência do ponto:** `defectPosition.meshRegionId` deve ser a própria região confirmada ou um ancestral dela com geometria.
7. **Texto de confirmação:** fica no front-end e é sempre "Localização confirmada pelo usuário." [F]. O servidor não gera textos de validação técnica.
8. **Captura:**
   - só `image/jpeg` ou `image/png`, com no máximo 512 KB [D];
   - dimensões de no máximo 2048 × 2048;
   - conferir o `sha256` enviado.

## 5. Tamanho da captura

**Medido [F]** (`test_fase6.py`, `test_fallback_2d.py`):
- captura 3D: cerca de **60 KB** (JPEG 0,86, 808 × 738);
- captura 2D: cerca de **47 KB** (960 × 990).

**Proposta:**
- **Limite:** 512 KB por captura [D].
- **Compressão:** reduzir a qualidade (0,8 → 0,7) quando passar de 300 KB [D].
- **Cota:** uma captura por registro; a nova substitui a anterior [D].
- **Estimativa [I]:** 10 mil registros × 60 KB ≈ 0,6 GB. A política de retenção é [AD].

## 6. Privacidade e segurança [D]

- **Conteúdo:** a captura mostra só o modelo demonstrativo e o aviso. Não contém dados pessoais, fotos da peça real, matrícula nem identificação de aeronave real [F: GLB sem identificação, auditoria das Fases A–H].
- **Metadados:** remover EXIF e metadados da imagem no servidor. Hoje o canvas não os grava [I].
- **Coordenadas:** são do **modelo demonstrativo**, não de uma aeronave real. Precisam ser rotuladas como tal em qualquer exportação.
- **Acesso:** as mesmas regras do registro de NC. A imagem é servida por uma rota autenticada, nunca por URL pública.
- **Auditoria:** registrar quem gravou, quando e qual versão (`auditHistory` já existe no registro local [F]).

## 7. Versionamento e migração [D]

| Situação | Migração |
|---|---|
| Registros com só `regionSelected` (texto) | mantidos como estão. Opcionalmente, o servidor tenta montar `locationIds` com `pathFromLabel`; o que não casar fica só em texto. |
| Textos da hierarquia antiga ("Fuselagem – Seção central · …") | mapeados pela tabela `SECTION_TO_ZONE` → região nova (a mesma do 2D). O resto fica só em texto, com a flag `legacy: true`. |
| Mudança do GLB | nova `modelRef.glbSha256`. Coordenadas antigas continuam válidas só para o GLB antigo; exibir aviso. |
| Mudança da hierarquia | nova `hierarchyVersion`, com tabela de equivalência de IDs e sem remover IDs antigos. |
| Rascunhos locais (IndexedDB) | ao primeiro envio autorizado, a captura local é enviada e o registro passa a guardar `snapshot.id` do servidor. |

## 8. Riscos

1. **Dependência de uma API de registros que ainda não existe:** esse é o maior custo e está fora do escopo da localização.
2. **Divergência entre as hierarquias do servidor e do front-end:** mitigação por fonte única gerada e teste de contrato.
3. **Crescimento do armazenamento com capturas:** limite, compressão e retenção [AD].
4. **Leitura indevida das coordenadas como posição real:** mitigação com o aviso demonstrativo em todas as saídas e o campo `aircraftModel`.

**Para implementar é preciso autorização explícita, conforme a seção 22.**
