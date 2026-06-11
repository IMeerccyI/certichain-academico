# Informe de entrega - CertiChain Academico

Repositorio Git de entrega: `URL_DEL_REPOSITORIO_GIT`

## Resumen ejecutivo

CertiChain Academico es una DApp Ethereum orientada a la certificacion academica. Su proposito es permitir que una institucion emita certificados verificables, que terceros puedan validar su autenticidad y que las revocaciones queden registradas sin eliminar el historial.

La solucion esta compuesta por un frontend React/Vite/TypeScript y un contrato inteligente Solidity llamado `CertificadoAcademico.sol`. No existe backend ni base de datos propia: el contrato inteligente es la fuente de verdad operacional. La interfaz se conecta a Ethereum mediante MetaMask real y `ethers` v6.

## Problema que resuelve

Los certificados academicos en PDF pueden ser copiados, alterados o presentados sin una forma simple de validar su origen. CertiChain Academico registra en blockchain el hash SHA-256 del documento y los datos minimos necesarios para confirmar:

- si el documento fue emitido por una autoridad autorizada;
- si el contenido del PDF coincide con el hash registrado;
- si el certificado sigue vigente o fue revocado;
- que eventos forman parte del historial de emision, verificacion, recepcion o revocacion.

## Cumplimiento de requisitos funcionales

| Requisito | Cumplimiento |
| --- | --- |
| RF1 - Emision | Un emisor autorizado ejecuta `emitirCertificado`, registra codigo unico, datos minimos, hash SHA-256, wallet del estudiante y URI de metadata. La emision tambien crea un NFT ERC-721 asociado. |
| RF2 - Verificacion | La DApp permite verificar por codigo, hash o PDF. En el caso de PDF, el frontend recalcula el hash y consulta el contrato. El contrato expone `verificarCertificado` y `consultarPorCodigo`. |
| RF3 - Revocacion | Un emisor autorizado puede ejecutar `revocarCertificado` indicando motivo. El estado cambia a revocado y el historial se conserva. |
| RF4 - Historial/ledger | El contrato registra eventos de emision, recepcion, verificacion registrada y revocacion. La DApp consulta `consultarHistorial` y puede listar certificados con `listarCertificados`. |
| RF5 - Emisores autorizados | El administrador gestiona emisores mediante `autorizarEmisor`, `desactivarEmisor`, `listarEmisores` y roles de OpenZeppelin `AccessControl`. |

## Flujo PDF, hash y blockchain

El PDF no se almacena en blockchain. El flujo de integridad es:

1. El emisor prepara o carga el PDF academico.
2. El frontend calcula localmente el SHA-256 del archivo.
3. El emisor firma con MetaMask la transaccion de emision.
4. El contrato guarda el hash `bytes32`, codigo institucional, datos minimos, emisor, estudiante, estado y token NFT.
5. Un verificador puede cargar el PDF nuevamente; la DApp recalcula el SHA-256 y consulta el contrato.
6. Si el hash coincide y el estado es valido, el certificado se considera autentico y vigente.
7. Si el hash no existe, no coincide o el estado es revocado, la DApp informa el resultado correspondiente.

Este flujo permite comprobar integridad sin exponer documentos completos y sin pagar gas por almacenar archivos pesados.

## Roles del sistema

| Rol | Responsabilidades |
| --- | --- |
| Administrador academico | Despliega o administra el contrato, autoriza y desactiva emisores. Tiene `DEFAULT_ADMIN_ROLE`. |
| Emisor autorizado | Emite certificados, registra hashes, revoca certificados con motivo y consulta historial. Tiene `EMISOR_ROLE`. |
| Estudiante | Recibe el certificado asociado a su wallet, firma recepcion y consulta su NFT academico. |
| Verificador publico | Consulta por codigo, hash o PDF para validar autenticidad y estado. |
| Auditor | Revisa eventos, ledger, historial y evidencias criptograficas. |

## Contrato inteligente principal

Contrato: `blockchain/contracts/CertificadoAcademico.sol`

Funciones principales:

| Funcion | Uso |
| --- | --- |
| `emitirCertificado` | Registra certificado y crea NFT ERC-721. |
| `verificarCertificado` | Consulta gratuita por hash SHA-256. |
| `consultarPorCodigo` | Recupera datos del certificado por codigo institucional. |
| `revocarCertificado` | Marca certificado como revocado y guarda motivo. |
| `consultarHistorial` | Devuelve eventos asociados a un certificado. |
| `listarCertificados` | Lista certificados paginados para la interfaz. |
| `autorizarEmisor` | Concede rol de emisor. |
| `desactivarEmisor` | Revoca rol de emisor. |
| `listarEmisores` | Lista emisores registrados y su estado. |
| `firmarRecepcion` | Registra aceptacion del estudiante asignado. |
| `verificarYRegistrar` | Verifica y deja evento de verificacion en el ledger. |
| `ownerOf` | Consulta propietario del NFT. |
| `tokenURI` | Consulta metadata asociada al NFT. |

## Seguridad e integridad

- MetaMask es la wallet real para firmar transacciones. No se usa una wallet falsa para operaciones de escritura.
- La autorizacion de emisores se controla con `AccessControl`.
- El codigo del certificado y el hash del documento deben ser unicos.
- La revocacion no elimina el registro original; solo actualiza estado y conserva historial.
- El hash SHA-256 detecta alteraciones del PDF.
- Los costos de gas se reducen al guardar hashes y datos minimos, no archivos completos.
- En Sepolia se usa ETH de prueba de faucet. No hay costo con dinero real.

## Redes soportadas

| Red | ChainId | RPC recomendado | Uso |
| --- | --- | --- | --- |
| Hardhat Local | `31337` | `http://127.0.0.1:8545` | Desarrollo y defensa local. |
| Ganache Local | `1337` | `http://127.0.0.1:7545` | Desarrollo local alternativo. |
| Sepolia | `11155111` | RPC del proveedor | Evidencia en testnet publica. |

El despliegue actualiza los artefactos consumidos por el frontend en `src/lib/web3/contract-info.json` y `src/lib/web3/deployments.json`.

## Datos precargados y demostracion

El frontend puede incluir pocos fixtures para facilitar formularios, listados iniciales y demostraciones guiadas. Esos datos son auxiliares de interfaz. Para las operaciones academicas reales de la practica, la fuente de verdad es el contrato desplegado y las transacciones confirmadas.

## Limitaciones conocidas razonables

- La disponibilidad de Sepolia depende del RPC configurado y de fondos de faucet.
- El PDF original debe conservarse fuera de la blockchain por la institucion o el estudiante.
- La metadata del NFT depende del URI elegido por la institucion, por ejemplo IPFS o un servicio institucional.
- Tras cada nuevo despliegue se debe actualizar la direccion del contrato usada por el frontend.
- Las transacciones requieren MetaMask y una red soportada.

## Evidencias recomendadas

- Captura del despliegue con direccion del contrato.
- Captura de MetaMask conectado a la red correcta.
- Captura de emision con hash SHA-256 del PDF.
- Captura de transaccion confirmada.
- Captura de verificacion por codigo.
- Captura de verificacion por PDF recalculando hash.
- Captura de revocacion con motivo.
- Captura de historial/ledger.
- Captura de lista de emisores.
- Captura de recepcion firmada por estudiante.
- Captura de `ownerOf` o `tokenURI` del NFT academico.

## Checklist de entrega

- Repositorio Git: `URL_DEL_REPOSITORIO_GIT`
- README completo para instalacion y ejecucion.
- Guia de uso para administrador, emisor, estudiante y verificador.
- Diagrama de arquitectura.
- Documento de pruebas y despliegue.
- Capturas sugeridas guardadas para la defensa.
- Comandos verificados por el desarrollador:
  - `npm.cmd run test`
  - `npm.cmd run build`
  - `npm.cmd run compile` dentro de `blockchain`
  - `npm.cmd run test` dentro de `blockchain`
  - `npm.cmd run deploy:localhost`, `deploy:ganache` o `deploy:sepolia` segun la red usada.
