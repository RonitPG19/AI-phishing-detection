package com.phishing.scanner_app.controller;

import com.phishing.scanner_app.config.SecurityConfig;
import com.phishing.scanner_app.dto.CursorPageResponse;
import com.phishing.scanner_app.dto.FlagResponse;
import com.phishing.scanner_app.dto.HistoryItemResponse;
import com.phishing.scanner_app.dto.HistoryRequestSummary;
import com.phishing.scanner_app.dto.ScanCategoryResponse;
import com.phishing.scanner_app.dto.ScanResponse;
import com.phishing.scanner_app.dto.ScanSectionsResponse;
import com.phishing.scanner_app.model.HeaderInspectionResult;
import com.phishing.scanner_app.security.JwtUtil;
import com.phishing.scanner_app.service.FirestoreReportService;
import com.phishing.scanner_app.service.FirestoreScanFlagService;
import com.phishing.scanner_app.service.FirestoreScanHistoryService;
import com.phishing.scanner_app.service.ScanOrchestrationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
    PhishingScannerController.class,
    PhishingHistoryController.class,
    PhishingFlagController.class
})
@Import(SecurityConfig.class)
class PhishingScannerControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ScanOrchestrationService scanOrchestrationService;

    @MockBean
    private FirestoreReportService firestoreReportService;

    @MockBean
    private FirestoreScanHistoryService historyService;

    @MockBean
    private FirestoreScanFlagService flagService;

    @MockBean
    private JwtUtil jwtUtil;

    // ═══════════════════════════════════════════════════════════════
    //  Scan endpoint security
    // ═══════════════════════════════════════════════════════════════

    @Test
    void scanEndpointRejectsUnauthenticatedRequests() throws Exception {
        mockMvc.perform(post("/api/phishing/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"subject":"Hi","from":"sender@example.com","bodyText":"Body"}
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void scanEndpointAllowsAuthenticatedUsers() throws Exception {
        when(scanOrchestrationService.scanEmail(anyString(), any(), anyBoolean())).thenReturn(sampleScanResponse());

        mockMvc.perform(post("/api/phishing/scan")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"subject":"Hi","from":"sender@example.com","bodyText":"Body"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reportId").value("report-1"))
            .andExpect(jsonPath("$.historyId").value("history-1"));
    }

    @Test
    void scanEndpointAllowsAdminRole() throws Exception {
        when(scanOrchestrationService.scanEmail(anyString(), any(), anyBoolean())).thenReturn(sampleScanResponse());

        mockMvc.perform(post("/api/phishing/scan")
                .with(SecurityMockMvcRequestPostProcessors.user("admin-1").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"subject":"Hi","from":"sender@example.com","bodyText":"Body"}
                    """))
            .andExpect(status().isOk());
    }

    @Test
    void scanEndpointAcceptsForceRefreshParam() throws Exception {
        when(scanOrchestrationService.scanEmail(anyString(), any(), anyBoolean())).thenReturn(sampleScanResponse());

        mockMvc.perform(post("/api/phishing/scan")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER"))
                .param("forceRefresh", "true")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"subject":"Hi","from":"sender@example.com","bodyText":"Body"}
                    """))
            .andExpect(status().isOk());
    }

    // ═══════════════════════════════════════════════════════════════
    //  Report listing security
    // ═══════════════════════════════════════════════════════════════

    @Test
    void reportListingRequiresAdmin() throws Exception {
        mockMvc.perform(get("/api/phishing/reports")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER")))
            .andExpect(status().isForbidden());
    }

    @Test
    void reportListingAllowsAdmin() throws Exception {
        when(firestoreReportService.listReports(anyInt())).thenReturn(List.of());

        mockMvc.perform(get("/api/phishing/reports")
                .with(SecurityMockMvcRequestPostProcessors.user("admin-1").roles("ADMIN")))
            .andExpect(status().isOk());
    }

    // ═══════════════════════════════════════════════════════════════
    //  History endpoint security
    // ═══════════════════════════════════════════════════════════════

    @Test
    void historyListRejectsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/phishing/history"))
            .andExpect(status().isForbidden());
    }

    @Test
    void historyListAllowsAuthenticatedUser() throws Exception {
        when(historyService.listHistory(anyString(), anyInt(), any()))
            .thenReturn(new CursorPageResponse<>(List.of(), null));

        mockMvc.perform(get("/api/phishing/history")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void historyGetRejectsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/phishing/history/hist-1"))
            .andExpect(status().isForbidden());
    }

    @Test
    void historyGetAllowsAuthenticatedUser() throws Exception {
        when(historyService.getHistory(anyString(), anyString())).thenReturn(sampleHistoryItem());

        mockMvc.perform(get("/api/phishing/history/hist-1")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.historyId").value("hist-1"));
    }

    @Test
    void historyDeleteRejectsUnauthenticated() throws Exception {
        mockMvc.perform(delete("/api/phishing/history/hist-1"))
            .andExpect(status().isForbidden());
    }

    @Test
    void historyDeleteAllowsAuthenticatedUser() throws Exception {
        mockMvc.perform(delete("/api/phishing/history/hist-1")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER")))
            .andExpect(status().isNoContent());
    }

    // ═══════════════════════════════════════════════════════════════
    //  Flag endpoint security
    // ═══════════════════════════════════════════════════════════════

    @Test
    void reportFlagCreationRejectsUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/phishing/reports/report-1/flags")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"reasonCode":"FALSE_POSITIVE","comment":"test"}
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void reportFlagCreationAllowsAuthenticatedUser() throws Exception {
        when(flagService.createReportFlag(anyString(), anyString(), any())).thenReturn(sampleFlagResponse());

        mockMvc.perform(post("/api/phishing/reports/report-1/flags")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"reasonCode":"FALSE_POSITIVE","comment":"test"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.flagId").value("flag-1"))
            .andExpect(jsonPath("$.status").value("open"));
    }

    @Test
    void findingFlagCreationRejectsUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/phishing/reports/report-1/findings/links-1/flags")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"reasonCode":"MISCLASSIFIED"}
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void findingFlagCreationAllowsAuthenticatedUser() throws Exception {
        FlagResponse findingFlag = new FlagResponse("flag-2", "report-1", "finding", "links-1",
            "MISCLASSIFIED", null, "2026-04-19T12:00:00Z", "open");
        when(flagService.createFindingFlag(anyString(), anyString(), anyString(), any())).thenReturn(findingFlag);

        mockMvc.perform(post("/api/phishing/reports/report-1/findings/links-1/flags")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"reasonCode":"MISCLASSIFIED"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.flagType").value("finding"))
            .andExpect(jsonPath("$.findingId").value("links-1"));
    }

    @Test
    void flagListMineRejectsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/phishing/flags/mine"))
            .andExpect(status().isForbidden());
    }

    @Test
    void flagListMineAllowsAuthenticatedUser() throws Exception {
        when(flagService.listMine(anyString(), anyInt(), any()))
            .thenReturn(new CursorPageResponse<>(List.of(), null));

        mockMvc.perform(get("/api/phishing/flags/mine")
                .with(SecurityMockMvcRequestPostProcessors.user("user-1").roles("USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isArray());
    }

    // ═══════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════

    private ScanResponse sampleScanResponse() {
        ScanCategoryResponse empty = new ScanCategoryResponse(List.of(), Map.of());
        return new ScanResponse(
            "Hi", "sender@example.com", 1,
            new ScanSectionsResponse(empty, empty, empty, empty),
            new HeaderInspectionResult(),
            10, "report-1", null, false,
            "2026-04-19T12:00:00Z", "2026-04-20T12:00:00Z", "history-1"
        );
    }

    private HistoryItemResponse sampleHistoryItem() {
        return new HistoryItemResponse(
            "hist-1", "report-1", "cache-1", "fresh_scan",
            "2026-04-19T12:00:00Z",
            new HistoryRequestSummary("sender@example.com", "Test Subject", 2),
            25, "sender@example.com", "Test Subject", 2
        );
    }

    private FlagResponse sampleFlagResponse() {
        return new FlagResponse("flag-1", "report-1", "report", null,
            "FALSE_POSITIVE", "test", "2026-04-19T12:00:00Z", "open");
    }
}
