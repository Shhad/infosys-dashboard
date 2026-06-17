package com.taskdashboard.taskservice.security;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Validates the Bearer JWT locally on every request (NFR-2): RS256 signature
 * against the loaded public key plus expiry with a small clock-skew leeway.
 * No network call to auth-service is made on this path.
 *
 * <p>On success the {@link UserPrincipal} is placed in the security context.
 * A missing or invalid token simply leaves the request unauthenticated, so the
 * security chain rejects protected endpoints with {@code 401} (AC-4, AC-14),
 * while {@code GET /api/health} stays public.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private static final String BEARER = "Bearer ";

    private final RSASSAVerifier verifier;
    private final long clockSkewSeconds;

    public JwtAuthFilter(JwtKeyProvider keyProvider,
                         @Value("${jwt.clock-skew-seconds:60}") long clockSkewSeconds) {
        this.verifier = new RSASSAVerifier(keyProvider.getPublicKey());
        this.clockSkewSeconds = clockSkewSeconds;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            String token = header.substring(BEARER.length()).trim();
            UserPrincipal principal = tryAuthenticate(token);
            if (principal != null) {
                var authority = new SimpleGrantedAuthority("ROLE_" + principal.role());
                var auth = new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(authority));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        filterChain.doFilter(request, response);
    }

    private UserPrincipal tryAuthenticate(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!jwt.verify(verifier)) {
                return null;
            }
            var claims = jwt.getJWTClaimsSet();

            Date exp = claims.getExpirationTime();
            long now = System.currentTimeMillis();
            if (exp == null || exp.getTime() + clockSkewSeconds * 1000 < now) {
                return null;
            }

            String sub = claims.getSubject();
            String role = claims.getStringClaim("role");
            if (sub == null || role == null) {
                return null;
            }
            return new UserPrincipal(UUID.fromString(sub), role);
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return null;
        }
    }
}
