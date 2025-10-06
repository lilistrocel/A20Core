# Register Demo App with Hub
# PowerShell script to register the text-to-hex converter

Write-Host "🚀 Registering Demo App with A20 Core Hub..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Register the app
Write-Host "Step 1: Registering app..." -ForegroundColor Yellow

$registerBody = @{
    app_name = "Text to Hex Converter (Demo)"
    app_version = "1.0.0"
    communication_sheet = @{
        app_metadata = @{
            app_id = "demo-text-to-hex"
            app_name = "Text to Hex Converter (Demo)"
            version = "1.0.0"
            communication_sheet_version = "1.0"
        }
        entities = @()
    }
    metadata = @{
        description = "Demo text-to-hex converter"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/apps/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerBody

    Write-Host "✅ App registered successfully!" -ForegroundColor Green
    Write-Host "App ID: $($response.data.app_id)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to register app: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Upload Display Sheet
Write-Host "Step 2: Uploading Display Sheet..." -ForegroundColor Yellow

$displaySheet = Get-Content "micro-apps\demo-text-to-hex\display-sheet.yaml" -Raw

# Convert YAML to JSON (simplified version for basic YAML)
# For production, use a proper YAML parser
$displaySheetJson = @{
    app_metadata = @{
        app_id = "demo-text-to-hex"
        app_name = "Text to Hex Converter (Demo)"
        version = "1.0.0"
        display_sheet_version = "1.0"
    }
    display_config = @{
        theme = @{
            primary_color = "#8B5CF6"
            secondary_color = "#10B981"
            icon = "code"
            icon_type = "material"
        }
        layout = @{
            default_grid_columns = 12
            default_widget_size = "medium"
        }
        widgets = @(
            @{
                widget_id = "hex_converter"
                widget_type = "custom"
                title = "Text to Hex Converter"
                description = "Convert any text to hexadecimal format"
                size = @{
                    columns = 12
                    rows = 2
                }
                position = @{
                    x = 0
                    y = 0
                }
                data_source = @{
                    type = "api"
                    endpoint = "http://localhost:3002/api/v1/convert"
                    method = "POST"
                }
                rendering = @{
                    component = "HexConverter"
                }
            }
        )
        actions = @()
    }
    interactions = @{
        forms = @()
        commands = @()
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/apps/demo-text-to-hex/display-sheet" `
        -Method Post `
        -ContentType "application/json" `
        -Body $displaySheetJson

    Write-Host "✅ Display Sheet uploaded successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to upload Display Sheet: $_" -ForegroundColor Red
    Write-Host "This is optional - the app is still registered" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Demo app registration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Refresh dashboard: http://localhost:3001" -ForegroundColor White
Write-Host "  2. You should see the demo app listed" -ForegroundColor White
Write-Host "  3. Click it to see the dashboard" -ForegroundColor White
Write-Host ""
Write-Host "Test the converter:" -ForegroundColor Cyan
Write-Host '  curl -X POST http://localhost:3002/api/v1/convert -H "Content-Type: application/json" -d "{\"input\": \"Hello World\"}"' -ForegroundColor White
Write-Host ""
