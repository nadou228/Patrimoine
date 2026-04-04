param (
    [Parameter(Mandatory=$true)]
    [string]$ModelName
)

$Package = "com.patris"
$BaseDir = "src\main\java\com\patris"

# Ensure the base directory exists
if (-not (Test-Path $BaseDir)) {
    Write-Host "Erreur: Le répertoire de base $BaseDir n'existe pas. Êtes-vous à la racine du projet ?" -ForegroundColor Red
    exit 1
}

$ModelLower = $ModelName.ToLower()
$ModelPath = "$BaseDir\model\$ModelName.java"
$RepoPath = "$BaseDir\repository\${ModelName}Repository.java"
$ServicePath = "$BaseDir\service\${ModelName}Service.java"
$ControllerPath = "$BaseDir\controller\${ModelName}Controller.java"

function Write-File ($Path, $Content) {
    $Dir = Split-Path $Path
    if (-not (Test-Path -Path $Dir)) {
        New-Item -ItemType Directory -Force -Path $Dir | Out-Null
    }
    if (-not (Test-Path $Path)) {
        Set-Content -Path $Path -Value $Content -Encoding UTF8
        Write-Host "Créé: $Path" -ForegroundColor Green
    } else {
        Write-Host "Existe déjà: $Path" -ForegroundColor Yellow
    }
}

# 1. Model
$modelContent = @"
package ${Package}.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = `"${ModelLower}s`")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class $ModelName {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // TODO: Ajoutez vos autres champs ici
}
"@

# 2. Repository
$repoContent = @"
package ${Package}.repository;

import ${Package}.model.${ModelName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${ModelName}Repository extends JpaRepository<${ModelName}, Long> {
}
"@

# 3. Service
$serviceContent = @"
package ${Package}.service;

import ${Package}.model.${ModelName};
import ${Package}.repository.${ModelName}Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ${ModelName}Service {
    
    private final ${ModelName}Repository repository;

    public List<${ModelName}> findAll() {
        return repository.findAll();
    }

    public ${ModelName} save(${ModelName} entity) {
        return repository.save(entity);
    }
    
    // Ajoutez d'autres méthodes métier ici
}
"@

# 4. Controller
$controllerContent = @"
package ${Package}.controller;

import ${Package}.model.${ModelName};
import ${Package}.service.${ModelName}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/${ModelLower}s")
@RequiredArgsConstructor
public class ${ModelName}Controller {
    
    private final ${ModelName}Service service;

    @GetMapping
    public ResponseEntity<List<${ModelName}>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @PostMapping
    public ResponseEntity<${ModelName}> create(@RequestBody ${ModelName} entity) {
        return ResponseEntity.ok(service.save(entity));
    }
}
"@

Write-File $ModelPath $modelContent
Write-File $RepoPath $repoContent
Write-File $ServicePath $serviceContent
Write-File $ControllerPath $controllerContent

Write-Host "Génération terminée avec succès pour le modèle $ModelName!" -ForegroundColor Cyan
Write-Host "Vous pouvez maintenant lancer le backend pour créer la table PostgreSQL." -ForegroundColor Cyan
