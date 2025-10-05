using System.Text.Json.Serialization;

namespace RadioQ10.Domain.Entities;

public sealed class SongQueueItem
{
    public Guid Id { get; set; }

    public required string VideoId { get; set; }

    public required string Title { get; set; }

    public string? ChannelTitle { get; set; }

    public string? ThumbnailUrl { get; set; }

    public string? RequestedBy { get; set; }

    public Guid? RequestedByUserId { get; set; }

    [JsonIgnore]
    public RadioUser? RequestedByUser { get; set; }

    public DateTimeOffset EnqueuedAt { get; set; }

    public string Url => $"https://www.youtube.com/watch?v={VideoId}";
}

