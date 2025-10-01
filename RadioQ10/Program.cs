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
builder.Services.AddSingleton<ISongQueueService, SongQueueService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapControllers();

app.MapHub<RadioHub>("/radioHub");

app.Run();

