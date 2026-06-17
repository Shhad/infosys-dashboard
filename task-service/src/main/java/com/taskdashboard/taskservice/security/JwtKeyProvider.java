package com.taskdashboard.taskservice.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyType;
import com.nimbusds.jose.jwk.RSAKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Loads the auth-service RS256 public key ONCE at startup (task 3.1, NFR-2).
 *
 * <p>Primary source is the PEM file shared via the read-only {@code keys}
 * volume ({@code JWT_PUBLIC_KEY_PATH}). If that file is absent and
 * {@code AUTH_JWKS_URL} is configured, the key is fetched once from the JWKS
 * endpoint at startup as a documented fallback. Either way, no network call to
 * auth-service happens on the per-request validation path.
 */
@Component
public class JwtKeyProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtKeyProvider.class);

    private final RSAPublicKey publicKey;

    public JwtKeyProvider(
            @Value("${jwt.public-key-path:}") String publicKeyPath,
            @Value("${jwt.jwks-url:}") String jwksUrl) {
        this.publicKey = load(publicKeyPath, jwksUrl);
        log.info("Loaded RS256 public key for local JWT validation");
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    private RSAPublicKey load(String publicKeyPath, String jwksUrl) {
        if (publicKeyPath != null && !publicKeyPath.isBlank()) {
            Path path = Path.of(publicKeyPath);
            if (Files.isReadable(path)) {
                try {
                    return parsePem(Files.readString(path));
                } catch (Exception e) {
                    throw new IllegalStateException(
                            "Failed to parse public key PEM at " + publicKeyPath, e);
                }
            }
            log.warn("Public key PEM not readable at {}", publicKeyPath);
        }

        if (jwksUrl != null && !jwksUrl.isBlank()) {
            try {
                log.info("Falling back to JWKS at startup: {}", jwksUrl);
                JWKSet jwkSet = JWKSet.load(URI.create(jwksUrl).toURL());
                RSAKey rsaKey = jwkSet.getKeys().stream()
                        .filter(k -> KeyType.RSA.equals(k.getKeyType()))
                        .map(k -> (RSAKey) k)
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("No RSA key in JWKS " + jwksUrl));
                return rsaKey.toRSAPublicKey();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to load JWKS from " + jwksUrl, e);
            }
        }

        throw new IllegalStateException(
                "No RS256 public key available: set JWT_PUBLIC_KEY_PATH to a readable PEM "
                        + "(shared via the keys volume) or AUTH_JWKS_URL.");
    }

    private RSAPublicKey parsePem(String pem) throws Exception {
        String base64 = pem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der = Base64.getDecoder().decode(base64);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(der);
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
    }
}
