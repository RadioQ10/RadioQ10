namespace RadioQ10.Models;

public sealed class SongQueueItem
{
    public Guid Id { get; init; }

    public required string VideoId { get; init; }

    public required string Title { get; init; }

    public string? ChannelTitle { get; init; }

    public string? ThumbnailUrl { get; init; }

    public string? RequestedBy { get; init; }

    public DateTimeOffset EnqueuedAt { get; init; }

    public string Url => $"https://www.youtube.com/watch?v={VideoId}";
}

