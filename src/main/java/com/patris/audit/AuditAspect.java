package com.patris.audit;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    // Intercepter toutes les méthodes save()
    @AfterReturning(
        pointcut = "execution(* com.patris.service.*.save*(..))",
        returning = "result"
    )
    public void logCreate(JoinPoint joinPoint, Object result) {

        if (result != null) {
            Long id = extractId(result);
            String entityName = result.getClass().getSimpleName();
            auditService.save("CREATE", entityName, id);
        }
    }

    // Intercepter update()
    @AfterReturning(
        pointcut = "execution(* com.patris.service.*.update*(..))",
        returning = "result"
    )
    public void logUpdate(JoinPoint joinPoint, Object result) {

        if (result != null) {
            Long id = extractId(result);
            String entityName = result.getClass().getSimpleName();
            auditService.save("UPDATE", entityName, id);
        }
    }

    // Intercepter delete()
    @After("execution(* com.patris.service.*.delete*(..))")
    public void logDelete(JoinPoint joinPoint) {

        Object[] args = joinPoint.getArgs();
        if (args.length > 0 && args[0] instanceof Long) {

            String entityName = joinPoint
                    .getTarget()
                    .getClass()
                    .getSimpleName()
                    .replace("Service", "");

            auditService.save("DELETE", entityName, (Long) args[0]);
        }
    }

    // Méthode utilitaire pour extraire l'id
    private Long extractId(Object entity) {
        try {
            java.lang.reflect.Method method = entity.getClass().getMethod("getId");
            return (Long) method.invoke(entity);
        } catch (Exception e) {
            return null;
        }
    }
}
