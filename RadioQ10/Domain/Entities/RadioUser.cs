using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace RadioQ10.Domain.Entities;

public sealed class RadioUser
{
    public Guid Id { get; set; }

    [Required]
    [StringLength(64)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(64)]
    public string IpAddress { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<SongQueueItem> RequestedSongs { get; set; } = new List<SongQueueItem>();
}
