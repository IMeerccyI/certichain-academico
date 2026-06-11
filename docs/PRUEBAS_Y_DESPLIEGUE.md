# Pruebas y despliegue - CertiChain Academico

Repositorio Git de entrega: `URL_DEL_REPOSITORIO_GIT`

Todos los comandos estan escritos para PowerShell en Windows usando `npm.cmd`.

## Instalacion limpia

Desde la raiz del repositorio:

```powershell
npm.cmd install
```

Dependencias blockchain:

```powershell
Push-Location .\blockchain
npm.cmd install
Pop-Location
```

## Pruebas del frontend

Ejecutar desde la raiz:

```powershell
npm.cmd run test
```

Build de produccion:

```powershell
npm.cmd run build
```

Lint:

```powershell
npm.cmd run lint
```

Preview del build:

```powershell
npm.cmd run preview
```

## Pruebas del contrato

Ejecutar desde `blockchain`:

```powershell
Push-Location .\blockchain
npm.cmd run compile
npm.cmd run test
Pop-Location
```

Las pruebas de contrato deben cubrir como minimo:

- despliegue del contrato;
- emisor administrador inicial;
- autorizacion y desactivacion de emisores;
- emision de certificado;
- rechazo de codigo duplicado;
- rechazo de hash duplicado;
- verificacion por hash;
- consulta por codigo;
- revocacion con motivo;
- historial de eventos;
- firma de recepcion por estudiante;
- NFT asociado mediante `ownerOf` y `tokenURI`.

## Despliegue local con Hardhat

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

Resultado esperado:

- red: `localhost`;
- chainId: `31337`;
- direccion del contrato `CertificadoAcademico`;
- archivos `src/lib/web3/contract-info.json` y `src/lib/web3/deployments.json` actualizados.

Frontend:

```powershell
npm.cmd run dev
```

MetaMask:

| Campo | Valor |
| --- | --- |
| Nombre | Hardhat Local |
| RPC | `http://127.0.0.1:8545` |
| ChainId | `31337` |
| Simbolo | `ETH` |

Importar una cuenta de prueba mostrada por `hardhat node`.

## Despliegue local con Ganache

1. Iniciar Ganache.
2. Confirmar RPC `http://127.0.0.1:7545`.
3. Confirmar chainId `1337`.

Desplegar:

```powershell
Push-Location .\blockchain
npm.cmd run deploy:ganache
Pop-Location
```

MetaMask:

| Campo | Valor |
| --- | --- |
| Nombre | Ganache Local |
| RPC | `http://127.0.0.1:7545` |
| ChainId | `1337` |
| Simbolo | `ETH` |

Importar una cuenta de prueba de Ganache.

## Despliegue en Sepolia

Sepolia es una red de prueba. Requiere SepoliaETH de faucet y un RPC de proveedor. No usa dinero real.

Configurar variables en la sesion PowerShell:

```powershell
$env:SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/TU_API_KEY"
$env:PRIVATE_KEY="0xCLAVE_PRIVADA_DE_CUENTA_DE_PRUEBA"
```

Desplegar:

```powershell
Push-Location .\blockchain
npm.cmd run deploy:sepolia
Pop-Location
```

Evidencias a guardar:

- direccion del contrato;
- hash de transaccion de despliegue;
- cuenta deployer;
- red y chainId `11155111`;
- enlace al contrato en Sepolia Etherscan si esta disponible.

## Ejecucion de la DApp para defensa

```powershell
npm.cmd run dev
```

Abrir la URL de Vite, normalmente `http://localhost:5173`.

Validar en pantalla:

- MetaMask conectada;
- chainId correcto;
- direccion del contrato cargada;
- cuenta con rol esperado;
- balance suficiente de ETH de prueba.

## Evidencias funcionales sugeridas

| Evidencia | Pantalla o comando |
| --- | --- |
| Contrato compilado | `npm.cmd run compile` en `blockchain`. |
| Tests contrato | `npm.cmd run test` en `blockchain`. |
| Tests frontend | `npm.cmd run test` en raiz. |
| Build frontend | `npm.cmd run build` en raiz. |
| Wallet conectada | Conexion Web3. |
| Emisor autorizado | Emisores. |
| Certificado emitido | Emitir Certificado + MetaMask. |
| Hash SHA-256 | Resultado del calculo local del PDF. |
| Verificacion por codigo | Verificacion Publica. |
| Verificacion por PDF | Verificacion Publica cargando archivo. |
| Revocacion | Revocacion + historial. |
| Ledger | Ledger Blockchain o Auditoria Distribuida. |
| Recepcion | Estudiantes o detalle del certificado. |
| NFT | NFT Academico, `ownerOf`, `tokenURI`. |

## Comandos para registrar como verificados por el desarrollador

Completar esta tabla al preparar la entrega final:

| Comando | Directorio | Resultado | Fecha |
| --- | --- | --- | --- |
| `npm.cmd run test` | raiz | 17 archivos, 49 tests passed | 2026-06-10 |
| `npm.cmd run build` | raiz | Build Vite/TypeScript passed | 2026-06-10 |
| `npm.cmd run lint` | raiz | ESLint passed | 2026-06-10 |
| `npm.cmd run compile` | `blockchain` | Hardhat compile passed | 2026-06-10 |
| `npm.cmd run test` | `blockchain` | 17 tests Hardhat passing | 2026-06-10 |
| `npm.cmd run deploy:localhost` | `blockchain` | Pendiente para defensa local | Pendiente |
| `npm.cmd run deploy:ganache` | `blockchain` | Pendiente si se usa Ganache | Pendiente |
| `npm.cmd run deploy:sepolia` | `blockchain` | Pendiente si se usa Sepolia | Pendiente |

## Checklist de troubleshooting

| Sintoma | Revision |
| --- | --- |
| `Red no soportada` | Confirmar chainId en MetaMask. |
| `Contrato no desplegado` | Ejecutar deploy de la red activa y revisar `deployments.json`. |
| `Insufficient funds` | Usar cuentas locales con ETH de prueba o faucet Sepolia. |
| `AccessControl` | Confirmar que la cuenta tenga rol admin o emisor. |
| `Documento ya certificado` | El mismo hash ya fue registrado. |
| `Codigo ya registrado` | Usar un codigo institucional unico. |
| Hash distinto | Confirmar que el PDF no haya sido modificado. |
| MetaMask no responde | Desbloquear extension, recargar pagina y reconectar. |

## Checklist de entrega

- Repositorio Git: `URL_DEL_REPOSITORIO_GIT`
- Dependencias instaladas en raiz y `blockchain`.
- Tests frontend ejecutados.
- Build frontend ejecutado.
- Contratos compilados.
- Tests Hardhat ejecutados.
- Contrato desplegado en al menos una red objetivo.
- MetaMask conectada a la red usada en la defensa.
- Capturas de emision, verificacion, revocacion, ledger, recepcion y NFT.
- Tabla de comandos verificados por el desarrollador completada.
