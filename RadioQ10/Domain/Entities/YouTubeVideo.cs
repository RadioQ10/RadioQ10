namespace RadioQ10.Domain.Entities;

public sealed class YouTubeVideo
{
    public required string VideoId { get; init; }

    public required string Title { get; init; }

    public string? ChannelTitle { get; init; }

    public string? Description { get; init; }

    public string? ThumbnailUrl { get; init; }

    public string Url => $"https://www.youtube.com/watch?v={VideoId}";
}

