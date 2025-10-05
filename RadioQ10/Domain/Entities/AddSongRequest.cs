using System.ComponentModel.DataAnnotations;

namespace RadioQ10.Domain.Entities;

public sealed class AddSongRequest
{
    [Required]
    [StringLength(64)]
    public string VideoId { get; set; } = string.Empty;

    [Required]
    [StringLength(256)]
    public string Title { get; set; } = string.Empty;

    [StringLength(128)]
    public string? ChannelTitle { get; set; }

    [Url]
    public string? ThumbnailUrl { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [StringLength(64)]
    public string RequestedBy { get; set; } = string.Empty;
}

