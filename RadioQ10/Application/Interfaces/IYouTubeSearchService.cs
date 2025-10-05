using RadioQ10.Domain.Entities;

namespace RadioQ10.Application.Interfaces;

public interface IYouTubeSearchService
{
    Task<IReadOnlyList<YouTubeVideo>> SearchAsync(string query, CancellationToken cancellationToken = default);
}

