package com.patris.copilot;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/copilot")
@RequiredArgsConstructor
@CrossOrigin("*")
public class CopilotController {

    private final CopilotService copilotService;

    @PostMapping("/query")
    public ResponseEntity<CopilotResponse> query(@RequestBody CopilotRequest request) {
        if (request == null || request.question() == null || request.question().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        CopilotResponse response = copilotService.processQuery(request.question());
        return ResponseEntity.ok(response);
    }
}
