// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CertificadoAcademico - Sistema de Certificacion Academica Blockchain
/// @notice Emision, verificacion y revocacion de certificados academicos
///         para universidades bolivianas. Cada certificado se representa
///         ademas como un NFT ERC-721 (extension opcional de la practica).
contract CertificadoAcademico is ERC721URIStorage, AccessControl {
    bytes32 public constant EMISOR_ROLE = keccak256("EMISOR_ROLE");

    enum EstadoCertificado {
        Inexistente,
        Valido,
        Revocado
    }

    struct Certificado {
        string codigo;
        string nombreEstudiante;
        string carrera;
        string tipoDocumento;
        bytes32 hashDocumento;
        address emisor;
        uint256 fechaEmision;
        EstadoCertificado estado;
        uint256 fechaRevocacion;
        string motivoRevocacion;
        address estudianteWallet;
        uint256 fechaRecepcion;
        uint256 tokenId;
    }

    struct EventoHistorial {
        string tipoEvento;
        address actor;
        uint256 fecha;
        string detalle;
    }

    uint256 private _siguienteTokenId = 1;

    // codigo del certificado => datos
    mapping(string => Certificado) private _certificados;
    // hash del documento => codigo (busqueda inversa para verificacion por PDF)
    mapping(bytes32 => string) private _codigoPorHash;
    // codigo => historial de eventos
    mapping(string => EventoHistorial[]) private _historial;
    // lista de codigos emitidos (para enumeracion off-chain)
    string[] private _codigos;
    // registro de emisores con metadatos
    address[] private _emisores;
    mapping(address => string) public nombreEmisor;
    mapping(address => string) public cargoEmisor;

    event CertificadoEmitido(
        string indexed codigoIndexed,
        string codigo,
        bytes32 hashDocumento,
        address indexed emisor,
        address indexed estudiante,
        uint256 tokenId,
        uint256 fecha
    );

    event CertificadoRevocado(
        string indexed codigoIndexed,
        string codigo,
        address indexed revocador,
        string motivo,
        uint256 fecha
    );

    event CertificadoVerificado(
        bytes32 indexed hashDocumento,
        address indexed verificador,
        bool valido,
        uint256 fecha
    );

    event RecepcionFirmada(
        string indexed codigoIndexed,
        string codigo,
        address indexed estudiante,
        uint256 fecha
    );

    event EmisorAutorizado(address indexed emisor, string nombre, string cargo);
    event EmisorDesactivado(address indexed emisor);

    constructor()
        ERC721("CertiChain Academico", "CERTI")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EMISOR_ROLE, msg.sender);
        _emisores.push(msg.sender);
        nombreEmisor[msg.sender] = "Administrador Academico";
        cargoEmisor[msg.sender] = "Admin";
    }

    // ------------------------------------------------------------------
    // RF5. Gestion de emisores
    // ------------------------------------------------------------------

    function autorizarEmisor(
        address emisor,
        string calldata nombre,
        string calldata cargo
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(emisor != address(0), "Direccion invalida");
        if (bytes(nombreEmisor[emisor]).length == 0) {
            _emisores.push(emisor);
        }
        nombreEmisor[emisor] = nombre;
        cargoEmisor[emisor] = cargo;
        _grantRole(EMISOR_ROLE, emisor);
        emit EmisorAutorizado(emisor, nombre, cargo);
    }

    function desactivarEmisor(address emisor)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(EMISOR_ROLE, emisor);
        emit EmisorDesactivado(emisor);
    }

    function esEmisorAutorizado(address cuenta) public view returns (bool) {
        return hasRole(EMISOR_ROLE, cuenta);
    }

    function listarEmisores()
        external
        view
        returns (
            address[] memory direcciones,
            string[] memory nombres,
            string[] memory cargos,
            bool[] memory activos
        )
    {
        uint256 total = _emisores.length;
        direcciones = new address[](total);
        nombres = new string[](total);
        cargos = new string[](total);
        activos = new bool[](total);
        for (uint256 i = 0; i < total; i++) {
            address cuenta = _emisores[i];
            direcciones[i] = cuenta;
            nombres[i] = nombreEmisor[cuenta];
            cargos[i] = cargoEmisor[cuenta];
            activos[i] = hasRole(EMISOR_ROLE, cuenta);
        }
    }

    // ------------------------------------------------------------------
    // RF1. Emision de certificados
    // ------------------------------------------------------------------

    /// @notice Registra el hash SHA-256 de un certificado PDF y acuna el NFT.
    /// @param codigo Codigo unico institucional del certificado.
    /// @param nombreEstudiante Nombre completo del estudiante.
    /// @param carrera Carrera o programa academico.
    /// @param tipoDocumento Diploma, certificado de notas, constancia, etc.
    /// @param hashDocumento SHA-256 del PDF (32 bytes).
    /// @param estudianteWallet Wallet del estudiante (recibe el NFT). Puede ser address(0).
    /// @param metadataURI URI de metadatos del NFT (JSON con datos academicos).
    function emitirCertificado(
        string calldata codigo,
        string calldata nombreEstudiante,
        string calldata carrera,
        string calldata tipoDocumento,
        bytes32 hashDocumento,
        address estudianteWallet,
        string calldata metadataURI
    ) external onlyRole(EMISOR_ROLE) returns (uint256 tokenId) {
        require(bytes(codigo).length > 0, "Codigo requerido");
        require(hashDocumento != bytes32(0), "Hash requerido");
        require(
            _certificados[codigo].estado == EstadoCertificado.Inexistente,
            "Codigo ya registrado"
        );
        require(
            bytes(_codigoPorHash[hashDocumento]).length == 0,
            "Documento ya certificado"
        );

        tokenId = _siguienteTokenId++;
        address receptorNft = estudianteWallet == address(0)
            ? msg.sender
            : estudianteWallet;
        _safeMint(receptorNft, tokenId);
        if (bytes(metadataURI).length > 0) {
            _setTokenURI(tokenId, metadataURI);
        }

        _certificados[codigo] = Certificado({
            codigo: codigo,
            nombreEstudiante: nombreEstudiante,
            carrera: carrera,
            tipoDocumento: tipoDocumento,
            hashDocumento: hashDocumento,
            emisor: msg.sender,
            fechaEmision: block.timestamp,
            estado: EstadoCertificado.Valido,
            fechaRevocacion: 0,
            motivoRevocacion: "",
            estudianteWallet: estudianteWallet,
            fechaRecepcion: 0,
            tokenId: tokenId
        });
        _codigoPorHash[hashDocumento] = codigo;
        _codigos.push(codigo);

        _historial[codigo].push(
            EventoHistorial({
                tipoEvento: "EMISION",
                actor: msg.sender,
                fecha: block.timestamp,
                detalle: string.concat("Emitido por ", nombreEmisor[msg.sender])
            })
        );

        emit CertificadoEmitido(
            codigo,
            codigo,
            hashDocumento,
            msg.sender,
            estudianteWallet,
            tokenId,
            block.timestamp
        );
    }

    /// @notice El estudiante firma digitalmente la recepcion del certificado.
    function firmarRecepcion(string calldata codigo) external {
        Certificado storage cert = _certificados[codigo];
        require(
            cert.estado != EstadoCertificado.Inexistente,
            "Certificado no existe"
        );
        require(
            cert.estudianteWallet == msg.sender,
            "Solo el estudiante asignado"
        );
        require(cert.fechaRecepcion == 0, "Recepcion ya firmada");

        cert.fechaRecepcion = block.timestamp;
        _historial[codigo].push(
            EventoHistorial({
                tipoEvento: "RECEPCION",
                actor: msg.sender,
                fecha: block.timestamp,
                detalle: "Estudiante firmo la recepcion"
            })
        );
        emit RecepcionFirmada(codigo, codigo, msg.sender, block.timestamp);
    }

    // ------------------------------------------------------------------
    // RF2. Verificacion de certificados
    // ------------------------------------------------------------------

    /// @notice Verifica un documento por su hash SHA-256 (consulta gratuita).
    function verificarCertificado(bytes32 hashDocumento)
        public
        view
        returns (
            bool valido,
            bool existe,
            string memory codigo,
            Certificado memory datos
        )
    {
        codigo = _codigoPorHash[hashDocumento];
        existe = bytes(codigo).length > 0;
        if (existe) {
            datos = _certificados[codigo];
            valido = datos.estado == EstadoCertificado.Valido;
        }
    }

    /// @notice Variante que deja constancia en el ledger de la verificacion.
    function verificarYRegistrar(bytes32 hashDocumento)
        external
        returns (bool valido)
    {
        (bool esValido, bool existe, string memory codigo, ) =
            verificarCertificado(hashDocumento);
        valido = esValido;

        if (existe) {
            _historial[codigo].push(
                EventoHistorial({
                    tipoEvento: "VERIFICACION",
                    actor: msg.sender,
                    fecha: block.timestamp,
                    detalle: esValido
                        ? "Verificacion exitosa"
                        : "Verificacion de certificado revocado"
                })
            );
        }
        emit CertificadoVerificado(
            hashDocumento,
            msg.sender,
            esValido,
            block.timestamp
        );
    }

    function consultarPorCodigo(string calldata codigo)
        external
        view
        returns (bool existe, Certificado memory datos)
    {
        datos = _certificados[codigo];
        existe = datos.estado != EstadoCertificado.Inexistente;
    }

    // ------------------------------------------------------------------
    // RF3. Revocacion
    // ------------------------------------------------------------------

    /// @notice Revoca un certificado emitido por error administrativo.
    ///         La informacion historica se conserva (inmutabilidad).
    function revocarCertificado(string calldata codigo, string calldata motivo)
        external
        onlyRole(EMISOR_ROLE)
    {
        Certificado storage cert = _certificados[codigo];
        require(
            cert.estado != EstadoCertificado.Inexistente,
            "Certificado no existe"
        );
        require(
            cert.estado == EstadoCertificado.Valido,
            "Certificado ya revocado"
        );
        require(bytes(motivo).length > 0, "Motivo requerido");

        cert.estado = EstadoCertificado.Revocado;
        cert.fechaRevocacion = block.timestamp;
        cert.motivoRevocacion = motivo;

        _historial[codigo].push(
            EventoHistorial({
                tipoEvento: "REVOCACION",
                actor: msg.sender,
                fecha: block.timestamp,
                detalle: motivo
            })
        );

        emit CertificadoRevocado(
            codigo,
            codigo,
            msg.sender,
            motivo,
            block.timestamp
        );
    }

    // ------------------------------------------------------------------
    // RF4. Historial y consultas
    // ------------------------------------------------------------------

    function consultarHistorial(string calldata codigo)
        external
        view
        returns (EventoHistorial[] memory)
    {
        return _historial[codigo];
    }

    function totalCertificados() external view returns (uint256) {
        return _codigos.length;
    }

    /// @notice Devuelve certificados paginados para listados en el frontend.
    function listarCertificados(uint256 desde, uint256 cantidad)
        external
        view
        returns (Certificado[] memory lote)
    {
        uint256 total = _codigos.length;
        if (desde >= total) {
            return new Certificado[](0);
        }
        uint256 fin = desde + cantidad;
        if (fin > total) {
            fin = total;
        }
        lote = new Certificado[](fin - desde);
        for (uint256 i = desde; i < fin; i++) {
            lote[i - desde] = _certificados[_codigos[i]];
        }
    }

    // ------------------------------------------------------------------
    // Soporte de interfaces (ERC721 + AccessControl)
    // ------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
