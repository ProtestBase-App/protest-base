package expo.modules.hka

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Hardware Key Attestation module.
 *
 * Bridges `services/integrity.service.ts` (Android branch) to the Android
 * Keystore so we can produce the cert chain and ECDSA assertion signatures that
 * the backend's `/auth/integrity/attest` schema requires. iOS is handled
 * separately by `@expo/app-integrity`'s App Attest implementation.
 *
 * Requires API 28+ (KeyMaster 4) — older devices throw `HkaUnsupportedDevice`,
 * which surfaces to the user as the IntegrityFailedScreen "device too old" copy.
 */
class HkaUnsupportedDeviceException :
  CodedException(
    "Hardware Key Attestation requires Android 9 (API 28) or higher",
  )

class HkaKeyNotFoundException(alias: String) :
  CodedException("No Hardware Key Attestation key found for alias: $alias")

class HkaInternalException(message: String) : CodedException(message)

class HkaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoHka")

    Function("isSupported") { isApiSupported() }

    AsyncFunction("attest") { alias: String, nonce: String ->
      requireSupported()
      val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

      // Wipe any stale entry so setAttestationChallenge always applies to a
      // freshly-generated key. Without this, retries against an alias whose
      // cert chain was already rejected by the backend would replay the same
      // (rejected) chain and loop forever.
      if (keyStore.containsAlias(alias)) {
        keyStore.deleteEntry(alias)
      }

      val generator = KeyPairGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_EC,
        ANDROID_KEYSTORE,
      )
      val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
        .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE))
        .setDigests(KeyProperties.DIGEST_SHA256)
        .setAttestationChallenge(nonce.toByteArray(Charsets.UTF_8))
        .build()
      generator.initialize(spec)
      generator.generateKeyPair()

      val chain = keyStore.getCertificateChain(alias)
        ?: throw HkaInternalException("Keystore returned null cert chain for alias $alias")

      // Leaf-first ordering is what AndroidKeyStore returns natively — matches
      // the backend's schema. Encode each cert as base64-DER without line
      // wrapping (Base64.NO_WRAP). The backend caps each entry at 4 KiB and
      // the whole chain at 10 entries.
      val certChain = chain.map { cert ->
        Base64.encodeToString(cert.encoded, Base64.NO_WRAP)
      }

      // keyId = base64url(SHA-256(leaf SPKI)) — URL-safe alphabet, no padding —
      // matching the backend integration spec so the server can recompute the
      // same value from the leaf cert and confirm it. `publicKey.encoded` on a
      // Java/Android cert is already X.509 SubjectPublicKeyInfo DER, so we hash
      // exactly the SPKI bytes (not the whole cert).
      val spkiBytes = chain[0].publicKey.encoded
      val keyId = sha256Base64Url(spkiBytes)

      mapOf("keyId" to keyId, "certChain" to certChain)
    }

    AsyncFunction("sign") { alias: String, nonce: String ->
      requireSupported()
      val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
      val entry = keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
        ?: throw HkaKeyNotFoundException(alias)

      val privateKey: PrivateKey = entry.privateKey
      val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
      signature.initSign(privateKey)
      signature.update(nonce.toByteArray(Charsets.UTF_8))
      // JCA Signature.sign() returns DER-encoded (r, s). Base64-wrap for the
      // JSON payload; backend reverses with Base64.decode + DER parse.
      val signed = signature.sign()
      Base64.encodeToString(signed, Base64.NO_WRAP)
    }

    Function("hasKey") { alias: String ->
      if (!isApiSupported()) return@Function false
      val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
      keyStore.containsAlias(alias)
    }

    AsyncFunction("clear") { alias: String ->
      if (!isApiSupported()) return@AsyncFunction
      val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
      if (keyStore.containsAlias(alias)) {
        keyStore.deleteEntry(alias)
      }
    }

  }

  private fun isApiSupported(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P

  private fun requireSupported() {
    if (!isApiSupported()) throw HkaUnsupportedDeviceException()
  }

  /**
   * base64url(SHA-256(bytes)) — URL-safe alphabet (`-`/`_`), no `=` padding,
   * no line wrapping. Matches the backend's keyId derivation so the
   * server-side recomputation of the leaf SPKI hash agrees with what we send.
   */
  private fun sha256Base64Url(bytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
    return Base64.encodeToString(
      digest,
      Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP,
    )
  }

  companion object {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val EC_CURVE = "secp256r1"
    private const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
  }
}
