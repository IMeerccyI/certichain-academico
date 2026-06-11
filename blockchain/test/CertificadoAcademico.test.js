const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Simula el hash SHA-256 de un PDF: en el frontend se calcula con WebCrypto,
// aqui usamos sha256 de ethers sobre el contenido binario simulado.
function hashDePdf(contenido) {
  return ethers.sha256(ethers.toUtf8Bytes(contenido));
}

describe("CertificadoAcademico", function () {
  async function desplegarFixture() {
    const [admin, rector, estudiante, empleador, atacante] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CertificadoAcademico");
    const contrato = await Factory.deploy();

    return { contrato, admin, rector, estudiante, empleador, atacante };
  }

  async function conCertificadoEmitidoFixture() {
    const base = await desplegarFixture();
    const { contrato, estudiante } = base;
    const hash = hashDePdf("PDF: Certificado Juan Perez - Ing. Sistemas");

    await contrato.emitirCertificado(
      "CERT-2026-001",
      "Juan Perez",
      "Ingenieria de Sistemas",
      "Diploma Academico",
      hash,
      estudiante.address,
      "ipfs://QmDemoMetadata"
    );

    return { ...base, hash };
  }

  describe("Despliegue y gestion de emisores (RF5)", function () {
    it("el deployer es admin y emisor autorizado", async function () {
      const { contrato, admin } = await loadFixture(desplegarFixture);
      expect(await contrato.esEmisorAutorizado(admin.address)).to.equal(true);
    });

    it("el admin puede autorizar nuevos emisores con nombre y cargo", async function () {
      const { contrato, rector } = await loadFixture(desplegarFixture);

      await expect(
        contrato.autorizarEmisor(rector.address, "Dra. Maria Rojas", "Rectora")
      )
        .to.emit(contrato, "EmisorAutorizado")
        .withArgs(rector.address, "Dra. Maria Rojas", "Rectora");

      expect(await contrato.esEmisorAutorizado(rector.address)).to.equal(true);
      expect(await contrato.nombreEmisor(rector.address)).to.equal(
        "Dra. Maria Rojas"
      );
    });

    it("un usuario no admin NO puede autorizar emisores", async function () {
      const { contrato, atacante, rector } = await loadFixture(desplegarFixture);

      await expect(
        contrato
          .connect(atacante)
          .autorizarEmisor(rector.address, "Falso", "Falso")
      ).to.be.revertedWithCustomError(
        contrato,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("el admin puede desactivar un emisor", async function () {
      const { contrato, rector } = await loadFixture(desplegarFixture);
      await contrato.autorizarEmisor(rector.address, "Rector", "Rector");
      await contrato.desactivarEmisor(rector.address);
      expect(await contrato.esEmisorAutorizado(rector.address)).to.equal(false);
    });
  });

  describe("Emision de certificados (RF1)", function () {
    it("un emisor autorizado registra el hash y acuna el NFT al estudiante", async function () {
      const { contrato, admin, estudiante } = await loadFixture(
        desplegarFixture
      );
      const hash = hashDePdf("PDF: Certificado Juan Perez");

      await expect(
        contrato.emitirCertificado(
          "CERT-2026-001",
          "Juan Perez",
          "Ingenieria de Sistemas",
          "Diploma Academico",
          hash,
          estudiante.address,
          "ipfs://QmDemo"
        )
      ).to.emit(contrato, "CertificadoEmitido");

      const [existe, datos] = await contrato.consultarPorCodigo(
        "CERT-2026-001"
      );
      expect(existe).to.equal(true);
      expect(datos.nombreEstudiante).to.equal("Juan Perez");
      expect(datos.hashDocumento).to.equal(hash);
      expect(datos.emisor).to.equal(admin.address);
      expect(datos.estado).to.equal(1n); // Valido

      // NFT ERC-721 en poder del estudiante
      expect(await contrato.ownerOf(datos.tokenId)).to.equal(
        estudiante.address
      );
      expect(await contrato.tokenURI(datos.tokenId)).to.equal("ipfs://QmDemo");
    });

    it("un usuario NO autorizado no puede emitir certificados", async function () {
      const { contrato, atacante, estudiante } = await loadFixture(
        desplegarFixture
      );

      await expect(
        contrato
          .connect(atacante)
          .emitirCertificado(
            "CERT-FAKE-999",
            "Hacker",
            "N/A",
            "Diploma",
            hashDePdf("falso"),
            estudiante.address,
            ""
          )
      ).to.be.revertedWithCustomError(
        contrato,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("rechaza codigos duplicados y documentos ya certificados", async function () {
      const { contrato, estudiante, hash } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      await expect(
        contrato.emitirCertificado(
          "CERT-2026-001",
          "Otro",
          "Otra",
          "Diploma",
          hashDePdf("otro pdf"),
          estudiante.address,
          ""
        )
      ).to.be.revertedWith("Codigo ya registrado");

      await expect(
        contrato.emitirCertificado(
          "CERT-2026-002",
          "Otro",
          "Otra",
          "Diploma",
          hash,
          estudiante.address,
          ""
        )
      ).to.be.revertedWith("Documento ya certificado");
    });

    it("el estudiante firma digitalmente la recepcion", async function () {
      const { contrato, estudiante } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      await expect(
        contrato.connect(estudiante).firmarRecepcion("CERT-2026-001")
      ).to.emit(contrato, "RecepcionFirmada");

      const [, datos] = await contrato.consultarPorCodigo("CERT-2026-001");
      expect(datos.fechaRecepcion).to.be.greaterThan(0n);
    });

    it("otro usuario NO puede firmar la recepcion ajena", async function () {
      const { contrato, atacante } = await loadFixture(
        conCertificadoEmitidoFixture
      );
      await expect(
        contrato.connect(atacante).firmarRecepcion("CERT-2026-001")
      ).to.be.revertedWith("Solo el estudiante asignado");
    });
  });

  describe("Verificacion de certificados (RF2)", function () {
    it("CERTIFICADO VALIDO: el hash del PDF original coincide", async function () {
      const { contrato, empleador, hash } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      const [valido, existe, codigo] = await contrato
        .connect(empleador)
        .verificarCertificado(hash);

      expect(existe).to.equal(true);
      expect(valido).to.equal(true);
      expect(codigo).to.equal("CERT-2026-001");
    });

    it("CERTIFICADO NO VALIDO: documento manipulado genera otro hash", async function () {
      const { contrato, empleador } = await loadFixture(
        conCertificadoEmitidoFixture
      );
      // El documento fue alterado: "Perez" -> "Peres"
      const hashManipulado = hashDePdf(
        "PDF: Certificado Juan Peres - Ing. Sistemas"
      );

      const [valido, existe] = await contrato
        .connect(empleador)
        .verificarCertificado(hashManipulado);

      expect(existe).to.equal(false);
      expect(valido).to.equal(false);
    });

    it("verificarYRegistrar deja constancia en el ledger", async function () {
      const { contrato, empleador, hash } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      await expect(contrato.connect(empleador).verificarYRegistrar(hash))
        .to.emit(contrato, "CertificadoVerificado")
        .withArgs(hash, empleador.address, true, anyUint());

      const historial = await contrato.consultarHistorial("CERT-2026-001");
      const tipos = historial.map((e) => e.tipoEvento);
      expect(tipos).to.include("VERIFICACION");
    });
  });

  describe("Revocacion de certificados (RF3)", function () {
    it("un emisor autorizado revoca con motivo y se conserva el historial", async function () {
      const { contrato, hash } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      await expect(
        contrato.revocarCertificado(
          "CERT-2026-001",
          "Error administrativo en la nota final"
        )
      ).to.emit(contrato, "CertificadoRevocado");

      const [, datos] = await contrato.consultarPorCodigo("CERT-2026-001");
      expect(datos.estado).to.equal(2n); // Revocado
      expect(datos.motivoRevocacion).to.equal(
        "Error administrativo en la nota final"
      );
      expect(datos.fechaRevocacion).to.be.greaterThan(0n);

      // Tras revocar, la verificacion devuelve NO VALIDO pero el registro existe
      const [valido, existe] = await contrato.verificarCertificado(hash);
      expect(existe).to.equal(true);
      expect(valido).to.equal(false);

      // La informacion historica se conserva
      expect(datos.nombreEstudiante).to.equal("Juan Perez");
    });

    it("un usuario NO autorizado no puede revocar", async function () {
      const { contrato, atacante } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      await expect(
        contrato
          .connect(atacante)
          .revocarCertificado("CERT-2026-001", "intento malicioso")
      ).to.be.revertedWithCustomError(
        contrato,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("no permite revocar dos veces ni sin motivo", async function () {
      const { contrato } = await loadFixture(conCertificadoEmitidoFixture);

      await expect(
        contrato.revocarCertificado("CERT-2026-001", "")
      ).to.be.revertedWith("Motivo requerido");

      await contrato.revocarCertificado("CERT-2026-001", "Error de datos");
      await expect(
        contrato.revocarCertificado("CERT-2026-001", "Otra vez")
      ).to.be.revertedWith("Certificado ya revocado");
    });
  });

  describe("Historial y consultas (RF4)", function () {
    it("consultarHistorial devuelve la trazabilidad completa", async function () {
      const { contrato, estudiante, hash } = await loadFixture(
        conCertificadoEmitidoFixture
      );

      await contrato.connect(estudiante).firmarRecepcion("CERT-2026-001");
      await contrato.verificarYRegistrar(hash);
      await contrato.revocarCertificado("CERT-2026-001", "Error administrativo");

      const historial = await contrato.consultarHistorial("CERT-2026-001");
      const tipos = historial.map((e) => e.tipoEvento);

      expect(tipos).to.deep.equal([
        "EMISION",
        "RECEPCION",
        "VERIFICACION",
        "REVOCACION",
      ]);
    });

    it("listarCertificados pagina los resultados", async function () {
      const { contrato, estudiante } = await loadFixture(desplegarFixture);

      for (let i = 1; i <= 3; i++) {
        await contrato.emitirCertificado(
          `CERT-2026-00${i}`,
          `Estudiante ${i}`,
          "Ingenieria de Sistemas",
          "Certificado de Notas",
          hashDePdf(`pdf-${i}`),
          estudiante.address,
          ""
        );
      }

      expect(await contrato.totalCertificados()).to.equal(3n);
      const lote = await contrato.listarCertificados(1, 10);
      expect(lote.length).to.equal(2);
      expect(lote[0].codigo).to.equal("CERT-2026-002");
    });
  });
});

// Helper para withArgs con timestamps variables
function anyUint() {
  return (value) => typeof value === "bigint" && value >= 0n;
}
