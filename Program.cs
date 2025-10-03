using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RadioQ10.Data;
using RadioQ10.Hubs;
using RadioQ10.Options;
using RadioQ10.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<YouTubeOptions>(builder.Configuration.GetSection("YouTube"));
builder.Services.AddHttpClient<IYouTubeSearchService, YouTubeSearchService>();

var connectionString = builder.Configuration.GetConnectionString("RadioDatabase");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Connection string 'RadioDatabase' is not configured.");
}


builder.Services.AddDbContext<RadioDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IRadioDbContext>(sp => sp.GetRequiredService<RadioDbContext>());
builder.Services.AddScoped<ISongQueueService, SongQueueService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RadioDbContext>();
    db.Database.EnsureCreated();
}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseHttpsRedirection();

app.MapControllers();

app.MapHub<RadioHub>("/radioHub");

app.Run();





