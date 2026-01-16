# Load Tests Directory

This directory contains k6 load testing scripts and results for AuthBridge APIs.

## Structure

```
load-tests/
├── README.md                          # This file
├── authbridge-load-test.js           # Main k6 test script (auto-generated)
├── results/                          # Test results (auto-generated)
│   ├── staging_smoke_TIMESTAMP/
│   │   ├── smoke-results.json
│   │   ├── smoke-summary.json
│   │   └── smoke-summary.html
│   └── ...
└── .gitignore                        # Ignore results directory
```

## Usage

Load test scripts are automatically generated when you run:

```bash
./scripts/load-test.sh [test-type] [environment]
```

## Test Types

- **smoke** - Quick validation (1 VU, 1 min)
- **load** - Standard load test (10-50 VUs, 5 min)
- **stress** - Find breaking point (10-200 VUs, 10 min)
- **spike** - Sudden traffic surge (0-100-0 VUs, 5 min)
- **soak** - Sustained load (50 VUs, 30 min)
- **all** - Run all test types

## Examples

```bash
# Quick smoke test
./scripts/load-test.sh smoke staging

# Standard load test
./scripts/load-test.sh load staging

# Run all tests
./scripts/load-test.sh all staging
```

## Results

Test results are saved to `results/` with timestamps:
- JSON files for programmatic analysis
- HTML files for visual reports

View HTML report:
```bash
open scripts/load-tests/results/staging_load_*/load-summary.html
```

## Documentation

See `docs/load-testing-guide.md` for comprehensive documentation.

## CI/CD Integration

Load tests can be integrated into GitHub Actions:

```yaml
- name: Run Load Test
  run: ./scripts/load-test.sh smoke staging
```

## Notes

- k6 must be installed: `brew install k6`
- Results directory is gitignored
- Test scripts are auto-generated on each run
- HTML reports use k6-reporter for visualization
