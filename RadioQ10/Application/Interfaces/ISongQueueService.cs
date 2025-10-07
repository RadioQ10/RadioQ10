using RadioQ10.Domain.Entities;

namespace RadioQ10.Application.Interfaces;

public interface ISongQueueService
{
    IReadOnlyCollection<SongQueueItem> GetAll();

    SongQueueItem? Get(Guid id);

    Task<SongQueueItem> Enqueue(string videoId, string title, string? channelTitle, string? thumbnailUrl, Guid userId, string? requestedBy);

    bool Remove(Guid id);
}

