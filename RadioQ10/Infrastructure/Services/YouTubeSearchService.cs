using System.Text.Json;
using Microsoft.Extensions.Options;
using RadioQ10.Application.Interfaces;
using RadioQ10.Domain.Entities;
using RadioQ10.Infrastructure.Options;

namespace RadioQ10.Infrastructure.Services;

public sealed class YouTubeSearchService : IYouTubeSearchService
{
    private readonly HttpClient _httpClient;
    private readonly YouTubeOptions _options;

    public YouTubeSearchService(HttpClient httpClient, IOptions<YouTubeOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<YouTubeVideo>> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Array.Empty<YouTubeVideo>();
        }

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException("Configure YouTube:ApiKey before performing searches.");
        }

        var requestUri = BuildRequestUri(query, _options.MaxResults);
        using var response = await _httpClient.GetAsync(requestUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (!document.RootElement.TryGetProperty("items", out var itemsElement))
        {
            return Array.Empty<YouTubeVideo>();
        }

        var results = new List<YouTubeVideo>();

        foreach (var item in itemsElement.EnumerateArray())
        {
            if (!TryGetVideoId(item, out var videoId))
            {
                continue;
            }

            if (!item.TryGetProperty("snippet", out var snippet))
            {
                continue;
            }

            var title = snippet.TryGetProperty("title", out var titleElement) ? titleElement.GetString() : null;
            if (string.IsNullOrWhiteSpace(title))
            {
                continue;
            }

            var channelTitle = snippet.TryGetProperty("channelTitle", out var channelElement) ? channelElement.GetString() : null;
            var description = snippet.TryGetProperty("description", out var descriptionElement) ? descriptionElement.GetString() : null;
            var thumbnailUrl = TryGetDefaultThumbnail(snippet);

            results.Add(new YouTubeVideo
            {
                VideoId = videoId,
                Title = title,
                ChannelTitle = channelTitle,
                Description = description,
                ThumbnailUrl = thumbnailUrl
            });
        }

        return results;
    }

    private static bool TryGetVideoId(JsonElement item, out string videoId)
    {
        videoId = string.Empty;

        if (!item.TryGetProperty("id", out var idElement))
        {
            return false;
        }

        if (idElement.TryGetProperty("videoId", out var videoIdElement))
        {
            var value = videoIdElement.GetString();
            if (!string.IsNullOrWhiteSpace(value))
            {
                videoId = value;
                return true;
            }
        }

        return false;
    }

    private static string? TryGetDefaultThumbnail(JsonElement snippet)
    {
        if (!snippet.TryGetProperty("thumbnails", out var thumbnails))
        {
            return null;
        }

        string[] preferenceOrder = ["medium", "high", "standard", "maxres", "default"];

        foreach (var key in preferenceOrder)
        {
            if (thumbnails.TryGetProperty(key, out var thumbnail) && thumbnail.TryGetProperty("url", out var urlElement))
            {
                var value = urlElement.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }
        }

        return null;
    }

    private string BuildRequestUri(string query, int maxResults)
    {
        var encodedQuery = Uri.EscapeDataString(query);
        var requestUri = $"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults={maxResults}&q={encodedQuery}&key={_options.ApiKey}";
        return requestUri;
    }
}

