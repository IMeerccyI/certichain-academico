# Guia de uso - CertiChain Academico

Esta guia describe los pasos para operar la DApp desde los roles principales: administrador, emisor, estudiante y verificador.

Repositorio Git de entrega: `URL_DEL_REPOSITORIO_GIT`

## Requisitos previos

- Tener dependencias instaladas en la raiz y en `blockchain`.
- Tener el contrato desplegado en una red soportada.
- Tener MetaMask instalado, desbloqueado y conectado a la red correcta.
- Usar una cuenta con el rol adecuado para operaciones restringidas.

Redes soportadas:

| Red | ChainId | RPC |
| --- | --- | --- |
| Hardhat Local | `31337` | `http://127.0.0.1:8545` |
| Ganache Local | `1337` | `http://127.0.0.1:7545` |
| Sepolia | `11155111` | RPC del proveedor |

## Iniciar la aplicacion

1. Levantar la red local o seleccionar Sepolia en MetaMask.
2. Desplegar el contrato en la red elegida.
3. Iniciar el frontend:

```powershell
npm.cmd run dev
```

4. Abrir la URL mostrada por Vite.
5. Entrar a la pantalla de Conexion Web3 y conectar MetaMask.

## Administrador academico

El administrador es la cuenta que despliega el contrato o una cuenta con `DEFAULT_ADMIN_ROLE`.

### Conectar wallet

1. Abrir la DApp.
2. Seleccionar Conexion Web3.
3. Presionar conectar MetaMask.
4. Confirmar que la red activa sea Hardhat, Ganache o Sepolia.
5. Verificar que la direccion del contrato aparezca como configurada.

### Autorizar emisor

1. Ir a Emisores.
2. Ingresar direccion wallet del emisor.
3. Ingresar nombre institucional y cargo.
4. Confirmar la transaccion `autorizarEmisor` en MetaMask.
5. Esperar confirmacion.
6. Revisar que el emisor aparezca como activo.

### Desactivar emisor

1. Ir a Emisores.
2. Seleccionar el emisor.
3. Ejecutar desactivacion.
4. Confirmar la transaccion `desactivarEmisor`.
5. Verificar que el emisor quede inactivo.

## Emisor autorizado

El emisor autorizado tiene `EMISOR_ROLE`. Puede emitir y revocar certificados.

### Emitir certificado con PDF

1. Conectar MetaMask con la cuenta emisora.
2. Ir a Emitir Certificado.
3. Completar los datos academicos:
   - codigo institucional unico;
   - nombre del estudiante;
   - carrera o programa;
   - tipo de documento;
   - wallet del estudiante, si corresponde;
   - URI de metadata NFT, si corresponde.
4. Cargar o generar el PDF del certificado.
5. Confirmar que el frontend calcule el SHA-256 del PDF.
6. Revisar el hash antes de emitir.
7. Firmar la transaccion `emitirCertificado` en MetaMask.
8. Esperar confirmacion.
9. Guardar como evidencia:
   - codigo del certificado;
   - hash SHA-256;
   - hash de transaccion;
   - direccion del contrato;
   - tokenId NFT.

### Buenas practicas para emision

- No reutilizar codigos de certificado.
- No modificar el PDF despues de emitirlo. Cualquier cambio altera el hash.
- No guardar datos sensibles innecesarios en blockchain.
- Mantener el PDF original en repositorio institucional, archivo academico o sistema documental externo.

## Verificador publico

El verificador puede validar certificados sin consultar directamente a la universidad. Las consultas de lectura no modifican estado; la opcion de registrar verificacion si requiere transaccion.

### Verificar por codigo

1. Ir a Verificacion Publica.
2. Seleccionar verificacion por codigo.
3. Ingresar el codigo institucional.
4. Ejecutar consulta.
5. Revisar resultado:
   - valido;
   - revocado;
   - no encontrado.

### Verificar por hash

1. Ir a Verificacion Publica.
2. Seleccionar verificacion por hash.
3. Ingresar hash SHA-256 hexadecimal de 64 caracteres.
4. Consultar el contrato.
5. Revisar estado y datos minimos asociados.

### Verificar por PDF

1. Ir a Verificacion Publica.
2. Seleccionar verificacion por PDF.
3. Cargar el PDF presentado por el estudiante.
4. La DApp recalcula el SHA-256 localmente.
5. La DApp consulta el contrato con ese hash.
6. Revisar si el PDF coincide con un certificado valido o si fue alterado, revocado o no encontrado.

### Registrar verificacion en ledger

1. Conectar MetaMask.
2. Usar la opcion de verificacion registrada.
3. Confirmar la transaccion `verificarYRegistrar`.
4. Revisar el evento en el historial del certificado.

## Revocacion

La revocacion se usa para errores administrativos o decisiones institucionales. No borra la emision original.

1. Conectar MetaMask con emisor autorizado.
2. Ir a Revocacion.
3. Buscar certificado por codigo.
4. Confirmar que el certificado exista y este vigente.
5. Escribir motivo claro de revocacion.
6. Firmar la transaccion `revocarCertificado`.
7. Esperar confirmacion.
8. Verificar que el estado cambie a revocado.
9. Revisar el historial para confirmar el evento de revocacion.

## Estudiante

El estudiante puede firmar recepcion y consultar su NFT academico si el certificado fue emitido a su wallet.

### Firmar recepcion

1. Conectar MetaMask con la wallet del estudiante asignado.
2. Ir a Estudiantes o al detalle del certificado.
3. Ingresar o seleccionar el codigo.
4. Firmar la transaccion `firmarRecepcion`.
5. Revisar que el historial incluya evento `RECEPCION`.

### Consultar NFT academico

1. Ir a NFT Academico.
2. Buscar por codigo o tokenId.
3. Consultar propietario con `ownerOf`.
4. Consultar metadata con `tokenURI`.
5. Verificar que el token corresponda al certificado emitido.

## Auditor o docente evaluador

Para revisar la practica:

1. Abrir Dashboard para ver estado general.
2. Revisar Conexion Web3 para confirmar red, wallet y contrato.
3. Ir a Ledger Blockchain y Auditoria Distribuida.
4. Consultar historial de un certificado emitido.
5. Confirmar que emision, verificacion registrada, recepcion y revocacion queden trazadas.
6. Comparar el hash del PDF contra el hash on-chain.

## Guion sugerido para defensa

1. Mostrar README y direccion del repositorio.
2. Levantar Hardhat o Ganache.
3. Desplegar contrato.
4. Conectar MetaMask a la red local.
5. Autorizar un emisor.
6. Emitir un certificado desde un PDF.
7. Verificar el certificado por codigo.
8. Verificar el mismo certificado cargando el PDF.
9. Modificar o usar otro PDF para demostrar que el hash cambia.
10. Firmar recepcion como estudiante.
11. Consultar `ownerOf` o `tokenURI`.
12. Revocar el certificado con motivo.
13. Verificar nuevamente y mostrar estado revocado.
14. Abrir historial/ledger.

## Checklist de entrega

- Repositorio Git: `URL_DEL_REPOSITORIO_GIT`
- Captura de Conexion Web3 con MetaMask real.
- Captura de emisor autorizado.
- Captura de emision con PDF y hash SHA-256.
- Captura de transaccion confirmada.
- Captura de verificacion por codigo.
- Captura de verificacion por hash o PDF.
- Captura de revocacion.
- Captura de historial/ledger.
- Captura de recepcion firmada.
- Captura de NFT academico.
- Comandos verificados por el desarrollador anotados en `docs/PRUEBAS_Y_DESPLIEGUE.md`.
