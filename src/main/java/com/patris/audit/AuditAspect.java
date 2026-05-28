package com.patris.audit;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.patris.model.Utilisateur;
import com.patris.security.CustomUserDetails;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @AfterReturning(pointcut = "execution(* com.patris.service.*.save*(..))", returning = "result")
    public void logCreate(JoinPoint joinPoint, Object result) {
        if (result == null) {
            return;
        }
        auditService.save("CREATE", result.getClass().getSimpleName(), extractId(result), resolveLogin(), resolveNom(), resolveIpAddress(), buildDetails(joinPoint, result), null, null);
    }

    @AfterReturning(pointcut = "execution(* com.patris.service.*.update*(..))", returning = "result")
    public void logUpdate(JoinPoint joinPoint, Object result) {
        if (result == null) {
            return;
        }
        auditService.save("UPDATE", result.getClass().getSimpleName(), extractId(result), resolveLogin(), resolveNom(), resolveIpAddress(), buildDetails(joinPoint, result), null, null);
    }

    @After("execution(* com.patris.service.*.delete*(..))")
    public void logDelete(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        if (args.length == 0 || !(args[0] instanceof Long id)) {
            return;
        }
        String entityName = joinPoint.getTarget().getClass().getSimpleName().replace("Service", "");
        auditService.save("DELETE", entityName, id, resolveLogin(), resolveNom(), resolveIpAddress(), buildDetails(joinPoint, null), null, null);
    }

    private Long extractId(Object entity) {
        try {
            return (Long) entity.getClass().getMethod("getId").invoke(entity);
        } catch (Exception exception) {
            return null;
        }
    }

    private String buildDetails(JoinPoint joinPoint, Object result) {
        String method = joinPoint.getSignature().getName();
        String args = Arrays.stream(joinPoint.getArgs())
            .map(this::safeToString)
            .collect(Collectors.joining(", "));
        String resultSummary = result != null ? safeToString(result) : "";
        return "{\"methode\":\"" + method + "\",\"arguments\":\"" + sanitize(args) + "\",\"resultat\":\"" + sanitize(resultSummary) + "\"}";
    }

    private String resolveLogin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }

    private String resolveNom() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return "Système";
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            Utilisateur utilisateur = userDetails.getUtilisateur();
            return ((utilisateur.getPrenom() != null ? utilisateur.getPrenom() + " " : "") + (utilisateur.getNom() != null ? utilisateur.getNom() : utilisateur.getUsername())).trim();
        }
        return authentication.getName();
    }

    private String resolveIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                return null;
            }
            HttpServletRequest request = attributes.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (Exception exception) {
            return null;
        }
    }

    private String safeToString(Object value) {
        if (value == null) {
            return "null";
        }
        String raw = value.toString();
        return raw.length() > 300 ? raw.substring(0, 300) + "..." : raw;
    }

    private String sanitize(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
