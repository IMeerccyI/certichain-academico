# CertiChain Academico


CertiChain Academico es una DApp Ethereum para emitir, verificar, revocar y auditar certificados academicos. La aplicacion usa un contrato inteligente como fuente de verdad operacional y una interfaz React para que administradores, emisores, estudiantes y verificadores interactuen con la red mediante MetaMask.

El sistema no requiere base de datos ni backend propio. Los datos criticos se registran en el contrato `CertificadoAcademico.sol`; el frontend solo prepara formularios, calcula hashes, muestra resultados y firma transacciones con la wallet del usuario.

## Objetivos

- Registrar certificados academicos de forma verificable en Ethereum.
- Evitar almacenar PDFs completos en blockchain.
- Guardar en el contrato solo datos minimos, estado, historial y hash SHA-256 del documento.
- Permitir verificacion publica por codigo, hash o PDF recalculando el hash localmente.
- Permitir revocacion trazable sin borrar el historial.
- Gestionar emisores autorizados mediante roles.
- Representar certificados como tokens NFT ERC-721 para consulta de propiedad academica.

## Stack tecnico

| Capa | Tecnologia |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Estado/UI | Zustand, componentes React, estilos tipo Tailwind |
| Web3 | ethers v6, MetaMask real |
| Contratos | Solidity, Hardhat, OpenZeppelin |
| Token academico | ERC-721 mediante `ERC721URIStorage` |
| Pruebas frontend | Vitest, Testing Library |
| Pruebas contrato | Hardhat test |
| Redes | Hardhat Local, Ganache Local, Sepolia Testnet |

## Alcance funcional

| RF | Requisito | Implementacion esperada |
| --- | --- | --- |
| RF1 | Emision | `emitirCertificado` registra codigo, datos academicos minimos, hash SHA-256, emisor, estudiante y NFT. |
| RF2 | Verificacion | `verificarCertificado`, `consultarPorCodigo` y verificacion por PDF recalculan o consultan el hash. |
| RF3 | Revocacion | `revocarCertificado` cambia el estado a revocado y conserva motivo e historial. |
| RF4 | Historial/ledger | `consultarHistorial`, eventos del contrato y listados muestran la trazabilidad. |
| RF5 | Emisores autorizados | `autorizarEmisor`, `desactivarEmisor`, `listarEmisores` y roles de OpenZeppelin controlan permisos. |

Funciones adicionales relevantes: `listarCertificados`, `firmarRecepcion`, `verificarYRegistrar`, `ownerOf` y `tokenURI`.

## Regla central sobre PDF y blockchain

Los PDFs no se guardan en blockchain. El flujo correcto es:

1. El usuario carga o genera el PDF en el navegador.
2. El frontend calcula el hash SHA-256 del archivo.
3. El emisor firma una transaccion con MetaMask.
4. El contrato guarda el hash, codigo, datos minimos y estado.
5. La verificacion posterior recalcula el hash del PDF y lo compara contra el valor on-chain.

Esto reduce costo de gas, evita exponer documentos privados y mantiene una prueba criptografica de integridad.

## Fuente de verdad

La fuente de verdad operacional es el smart contract desplegado. El frontend puede incluir pocos fixtures para precargar formularios y mostrar casos de demostracion inicial, pero esos fixtures no sustituyen la consulta on-chain ni autorizan certificados. Para la entrega, las operaciones de emision, verificacion, revocacion, historial, emisores, recepcion y NFT deben demostrarse contra el contrato.

## Estructura del repositorio

```text
.
|-- blockchain/
|   |-- contracts/CertificadoAcademico.sol
|   |-- scripts/deploy.js
|   |-- test/CertificadoAcademico.test.js
|   |-- hardhat.config.js
|   `-- package.json
|-- src/
|   |-- app/
|   |-- components/
|   |-- data/
|   |-- features/
|   |-- lib/
|   |   |-- hash.ts
|   |   `-- web3/
|   |       |-- service.ts
|   |       |-- contract-info.json
|   |       `-- deployments.json
|   |-- store/
|   `-- types/
|-- docs/
|-- .env.example
|-- package.json
`-- vite.config.ts
```

## Requisitos

- Node.js LTS y npm.
- PowerShell en Windows.
- MetaMask instalado y desbloqueado en el navegador.
- Para red local Hardhat: nodo Hardhat ejecutandose en `http://127.0.0.1:8545`.
- Para Ganache: workspace local en `http://127.0.0.1:7545`.
- Para Sepolia: RPC de testnet y ETH de prueba de faucet. No se usa dinero real.

## Instalacion

Desde la raiz del repositorio:

```powershell
npm.cmd install
```

Instalar dependencias del proyecto Hardhat:

```powershell
Push-Location .\blockchain
npm.cmd install
Pop-Location
```

## Variables de entorno

El archivo `.env.example` documenta las variables esperadas:

```env
SEPOLIA_RPC_URL=
PRIVATE_KEY=
VITE_SEPOLIA_RPC_URL=
```

| Variable | Uso |
| --- | --- |
| `SEPOLIA_RPC_URL` | Endpoint RPC para desplegar en Sepolia desde Hardhat. |
| `PRIVATE_KEY` | Clave privada de una cuenta de prueba para desplegar en Sepolia. No debe subirse al repositorio. |
| `VITE_SEPOLIA_RPC_URL` | Endpoint disponible para configuraciones frontend cuando se requiera lectura desde Sepolia. |

En PowerShell se pueden cargar variables para la sesion actual:

```powershell
$env:SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/TU_API_KEY"
$env:PRIVATE_KEY="0xCLAVE_PRIVADA_DE_CUENTA_DE_PRUEBA"
```

## Scripts principales

### Frontend

| Comando | Descripcion |
| --- | --- |
| `npm.cmd run dev` | Inicia Vite para desarrollo local. |
| `npm.cmd run build` | Compila TypeScript y genera `dist/`. |
| `npm.cmd run preview` | Sirve el build generado. |
| `npm.cmd run test` | Ejecuta pruebas frontend con Vitest. |
| `npm.cmd run lint` | Ejecuta ESLint. |

### Blockchain

Ejecutar dentro de `blockchain`:

| Comando | Descripcion |
| --- | --- |
| `npm.cmd run compile` | Compila contratos Solidity. |
| `npm.cmd run test` | Ejecuta pruebas Hardhat. |
| `npm.cmd run node` | Levanta nodo local Hardhat. |
| `npm.cmd run deploy:localhost` | Despliega en Hardhat Local `31337`. |
| `npm.cmd run deploy:ganache` | Despliega en Ganache Local `1337`. |
| `npm.cmd run deploy:sepolia` | Despliega en Sepolia `11155111`. |

El script de despliegue exporta ABI y direccion a:

- `src/lib/web3/contract-info.json`
- `src/lib/web3/deployments.json`

## Ejecucion local con Hardhat

Terminal 1:

```powershell
Push-Location .\blockchain
npm.cmd run node
```

Terminal 2:

```powershell
Push-Location .\blockchain
npm.cmd run deploy:localhost
Pop-Location
```

Terminal 3:

```powershell
npm.cmd run dev
```

Abrir la URL mostrada por Vite, normalmente `http://localhost:5173`.

## Ejecucion con Ganache

1. Abrir Ganache y confirmar RPC `http://127.0.0.1:7545`.
2. Configurar chainId `1337`.
3. Desplegar:

```powershell
Push-Location .\blockchain
npm.cmd run deploy:ganache
Pop-Location
```

4. Iniciar frontend:

```powershell
npm.cmd run dev
```

## Despliegue en Sepolia

Sepolia es una testnet. Requiere SepoliaETH de faucet para pagar gas de prueba, pero no requiere dinero real.

```powershell
$env:SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/TU_API_KEY"
$env:PRIVATE_KEY="0xCLAVE_PRIVADA_DE_CUENTA_DE_PRUEBA"
Push-Location .\blockchain
npm.cmd run deploy:sepolia
Pop-Location
```

Despues del despliegue, guardar la direccion del contrato y el hash de transaccion como evidencia. Si se usa un explorador, Sepolia se consulta en `https://sepolia.etherscan.io`.

## Uso con MetaMask

MetaMask debe ser una wallet real del navegador. La DApp no debe usar wallet falsa para firmar transacciones.

Redes objetivo:

| Red | RPC | ChainId | Uso |
| --- | --- | --- | --- |
| Hardhat Local | `http://127.0.0.1:8545` | `31337` | Desarrollo y pruebas locales. |
| Ganache Local | `http://127.0.0.1:7545` | `1337` | Desarrollo local con Ganache. |
| Sepolia | RPC del proveedor | `11155111` | Testnet publica. |

Para Hardhat y Ganache se importan cuentas de prueba generadas por el nodo local. Para Sepolia se usa una cuenta de testnet con SepoliaETH de faucet.

## Flujo basico de uso

1. Conectar MetaMask en una red soportada.
2. Confirmar que el contrato este desplegado para la red activa.
3. Como administrador, autorizar emisores cuando corresponda.
4. Como emisor, cargar/generar PDF, calcular SHA-256 y emitir certificado.
5. Como estudiante, firmar recepcion si el certificado fue asignado a su wallet.
6. Como verificador, consultar por codigo, hash o PDF.
7. Como emisor autorizado, revocar certificados indicando motivo.
8. Revisar ledger/historial y NFT academico.

## Troubleshooting

| Problema | Causa probable | Solucion |
| --- | --- | --- |
| MetaMask no aparece | Extension no instalada o navegador no compatible | Instalar MetaMask, desbloquear la cuenta y recargar la pagina. |
| Red no soportada | ChainId distinto a `31337`, `1337` o `11155111` | Cambiar a Hardhat, Ganache o Sepolia. |
| Contrato no desplegado | `deployments.json` no tiene direccion para la red activa | Ejecutar el script `deploy:*` correspondiente. |
| Fondos insuficientes | Cuenta sin ETH de prueba | Usar cuentas del nodo local o solicitar SepoliaETH en faucet. |
| Error de permisos | Cuenta sin rol de emisor/admin | Autorizar la cuenta con `autorizarEmisor` usando el administrador. |
| Hash no coincide | El PDF fue modificado o no es el mismo archivo | Volver a calcular SHA-256 del PDF original y verificar de nuevo. |
| Codigo duplicado | Ya existe un certificado con el mismo codigo | Usar un codigo institucional unico. |

