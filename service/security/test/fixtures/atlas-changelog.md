# Changelog (fixture — atlas-data 발췌)

## [2026.10]() (2026-10-28)

##### Content v2026.10

This version of ATLAS data contains 1 matrix, 16 tactics, 129 techniques, 92 sub-techniques, 44 mitigations, 77 case studies, 44 entities, and 37 software records.

###### Techniques

- Added new techniques

  - [Develop Capabilities: Malware](/techniques/AML.T0017.003)
  - [Outputs from AI Models](/techniques/AML.T0135)
    - Collection behavior separated out from [Exfiltration via AI Inference API](/techniques/AML.T0024)
  - [Exfiltration via AI User Interface](/techniques/AML.T0136)
  - [Training Data Information from AI Models](/techniques/AML.T0137)
  - [Training Data Information from AI Models: Infer Membership](/techniques/AML.T0137.000)
    - moved from "Exfiltration via AI Inference API: Infer Training Data Membership" (AML.T0024.000)
  - [Training Data Information from AI Models: Infer Properties](/techniques/AML.T0137.001)
  - [Training Data Information from AI Models: Invert AI Model](/techniques/AML.T0137.002)
    - moved from "Exfiltration via AI Inference API: Invert AI Model" (AML.T0024.001)
  - [Training Data Information from AI Models: Extract Memorized Data](/techniques/AML.T0137.003)
  - [Indicator Removal](/techniques/AML.T0138)
  - [Compromise Accounts](/techniques/AML.T0139)
  - [Centralized AI Service Request Routing](/techniques/AML.T0140)
  - [AI Service Request Metadata Sanitization](/techniques/AML.T0141)
  - [Event Triggered Execution](/techniques/AML.T0142)
  - [LLM Prompt Propagation](/techniques/AML.T0143)
  - [Recover AI Model Internals](/techniques/AML.T0144)
  - [Poison AI Agent Learning Environment](/techniques/AML.T0145)
  - [Data from AI Services: Conversation Context and Memory](/techniques/AML.T0085.002)
    - moved from "LLM Data Leakage" (AML.T0057)
  - [Data from AI Services: System Instructions](/techniques/AML.T0085.003)
    - moved from "Extract LLM System Prompt" (AML.T0056)

- Updated existing techniques

  - [Supply Chain Compromise](/techniques/AML.T0010)
    - Previously "AI Supply Chain Compromise"
  - [Supply Chain Compromise: Hardware](/techniques/AML.T0010.000)
  - [Supply Chain Compromise: Software](/techniques/AML.T0010.001)
    - Previously "AI Supply Chain Compromise: AI Software"
  - [Supply Chain Compromise: Data Repository](/techniques/AML.T0010.002)
    - Previously "AI Supply Chain Compromise: Data"
  - [Supply Chain Compromise: Model Repository](/techniques/AML.T0010.003)
    - Previously "AI Supply Chain Compromise: Model"
  - [Replicate AI Model Behavior](/techniques/AML.T0005)
    - Previously "Create AI Proxy Model"
  - [Replicate AI Model Behavior: Replicate Behavior from Gathered AI Artifacts](/techniques/AML.T0005.000)
    - Previously "Create Proxy AI Model: Train Proxy via Gathered AI Artifacts"
  - [Replicate AI Model Behavior: Replicate Behavior from Model Outputs](/techniques/AML.T0005.001)
    - Previously "Create Proxy AI Model: Train Proxy via Replication"
  - [Replicate AI Model Behavior: Adapt Existing Model to Replicate Behavior](/techniques/AML.T0005.002)
    - Previously "Create Proxy AI Model: Use Pre-Trained Model"
  - [Data from AI Services: RAG Databases](/techniques/AML.T0085.000)
  - [Data from AI Services: AI Agent Tools](/techniques/AML.T0085.001)
  - [Data from AI Services](/techniques/AML.T0085)
  - [Acquire Infrastructure: AI Service Proxies](/techniques/AML.T0008.005)
  - [Establish Accounts](/techniques/AML.T0021)
  - [Exfiltration via AI Inference API](/techniques/AML.T0024)
  - [AI Intellectual Property Theft](/techniques/AML.T0048.004)
  - [Phishing: Spearphishing via Social Engineering LLM](/techniques/AML.T0052.000)
  - [AI Agent Tool Invocation](/techniques/AML.T0053)
  - [LLM Prompt Self-Replication](/techniques/AML.T0061)
  - [Discover AI Model Outputs](/techniques/AML.T0063)
  - [LLM Prompt Crafting](/techniques/AML.T0065)
  - [Impersonation](/techniques/AML.T0073)
  - [Crafted AI Assistant Links](/techniques/AML.T0131)

###### Mitigations

- Added new mitigations

  - [Adaptive AI Response Degradation](/mitigations/AML.M0040)
  - [Privacy-Preserving AI Training and Inference](/mitigations/AML.M0041)
  - [Threat Intelligence Program](/mitigations/AML.M0042)
  - [AI Agent External Resource Lifecycle Management](/mitigations/AML.M0043)

- Updated existing mitigations

  - [Sanitize Training Data](/mitigations/AML.M0007)
  - [Validate AI Model](/mitigations/AML.M0008)
  - [Verify AI Artifacts](/mitigations/AML.M0014)
  - [Generative AI Guardrails](/mitigations/AML.M0020)
  - [Generative AI Model Alignment](/mitigations/AML.M0022)
  - [Manage Service AI Agent Access](/mitigations/AML.M0026)
    - Previously "Privileged AI Agent Permissions Configuration"
  - [Manage User-Delegated AI Agent Access](/mitigations/AML.M0027)
    - Previously "Single-User AI Agent Permissions Configuration"
  - [Enforce Access Controls for AI Agent Tools](/mitigations/AML.M0028)
    - Previously "AI Agent Tools Permissions Configuration"
  - [Maintain an AI Bill of Materials](/mitigations/AML.M0023)
    - Previously "AI Bill of Materials"
  - [AI Telemetry Logging and Monitoring](/mitigations/AML.M0024)
    - Previously "AI Telemetry Logging"
  - [AI Agent Authority Expansion Controls](/mitigations/AML.M0037)
  - [AI Agent Scope Drift Detection](/mitigations/AML.M0038)
    - Updated mitigation-to-technique relationships
      - [Limit Public Release of Information](/mitigations/AML.M0000)
      - [Limit Model Artifact Release](/mitigations/AML.M0001)
      - [Predictive AI Output Obfuscation](/mitigations/AML.M0002)
      - [Limit AI Service Query Volume and Rate](/mitigations/AML.M0004)
      - [Control Access to AI Models and Data at Rest](/mitigations/AML.M0005)
      - [Predictive AI Ensembles](/mitigations/AML.M0006)
      - [Restrict Library Loading](/mitigations/AML.M0011)
      - [Code Signing](/mitigations/AML.M0013)
      - [Vulnerability Scanning](/mitigations/AML.M0016)
      - [Generative AI Guidelines](/mitigations/AML.M0021)
      - [Maintai
