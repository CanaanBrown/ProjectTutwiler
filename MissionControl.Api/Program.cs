using MySqlConnector;
using System.Data;

var builder = WebApplication.CreateBuilder(args);

// Load controllers + endpoints
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Get DB connection string — Heroku will override this with config vars
var connectionString = builder.Configuration.GetConnectionString("MissionControlDb");

// Register MySQL connection for DI
builder.Services.AddScoped<IDbConnection>(_ => new MySqlConnection(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Serve wwwroot/index.html at "/"
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.Run();
