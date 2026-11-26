# acme-orders-api — supply-chain gate demo

Demo repository for [ssca](https://github.com/Vlad-Mirzoian/supply-chain-audit),
the software supply-chain auditing suite. **ACME and its order service are
fictional.** The application is a small Express service; what matters is its
CI pipeline, which runs ssca as a supply-chain gate on every push and pull
request.

> **Do not install the scenario branches.** They reference a vulnerable
> template engine, a package name that exists only as a dependency-confusion
> example, and a release of a real npm package that was compromised and later
> removed from the registry. The pipeline never installs them: the build job
> runs only after the audit has passed.

## Pipeline

[`.github/workflows/supply-chain.yml`](.github/workflows/supply-chain.yml),
every action pinned to a commit:

1. **audit** — installs a pinned ssca release (checksum verified), audits the
   CI configuration (`ssca ci-audit`) and runs the supply-chain audit with the
   project policy [`.ssca/policy.yaml`](.ssca/policy.yaml)
   (`ssca scan`). The SARIF report goes to code scanning, the evidence bundle
   (reports, SBOMs, manifest) is kept as a workflow artifact.
2. **build** — only if the audit passed: `npm ci --ignore-scripts`,
   `npm pack` and a signed SLSA build provenance for the package.
3. **release-gate** — verifies the signature and provenance of the built
   package with `ssca verify-artifact` before it may be released.

The ssca data snapshot is kept in the Actions cache between runs.

## Scenarios

`main` is the clean service and passes. Each scenario branch adds one realistic
supply-chain attack or mistake and is opened as a pull request against `main`:

| Branch | Change in the pull request | Expected decision |
|---|---|---|
| `main` | — | **PASS** (5 high-band warnings) |
| `s1-unsigned-dependency` | pin axios to 1.13.3, a release published without the provenance that the previous release had | **FAIL**: `provenance-regression`, `band-critical` |
| `s2-critical-reachable-cve` | downgrade ejs to 3.1.6 to match legacy templates | **FAIL**: `critical-reachable-cve` (GHSA-phwq-j96m-2c2q, template injection, reachable from `src/`) |
| `s3-dependency-confusion` | add the internal package `acme-billing-core`; the lockfile resolves it from the public registry instead of the internal one | **FAIL**: `dependency-confusion`, `band-critical` |
| `s4-compromised-dev-tool` | add `eslint-config-prettier` 10.1.7 as a development dependency | **FAIL**: `known-malicious` (MAL-2025-6022, baseline rule), `band-critical` |

The scenarios refer to real packages only to show how the policy reacts to
facts recorded in public data. For s1 there is no indication that axios 1.13.3
is malicious: the scenario shows how the policy treats a release whose
provenance attestation is missing although the previous release had one. The
eslint-config-prettier release of s4 was published in July 2025 from a
maintainer account taken over by phishing, contained malware in an install
script and was removed from npm; it is listed in OSV as MAL-2025-6022.

The decisions above were obtained with ssca 1.0.0 to 1.1.0; the scores of individual
components can change over time as advisories and registry data change.

## Run locally

    ssca scan --policy .ssca/policy.yaml --out ssca-out .

## Repository variables

The workflow downloads ssca from the URL in the repository variable
`SSCA_RELEASE_URL` and checks it against `SSCA_RELEASE_SHA256`.
