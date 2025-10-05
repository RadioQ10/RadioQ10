using RadioQ10.Domain.Entities;

namespace RadioQ10.Application.Interfaces;

public interface IUserService
{
    Task<RadioUser> RegisterAsync(string name, string ipAddress, CancellationToken cancellationToken = default);

    Task<RadioUser?> GetAsync(Guid id, CancellationToken cancellationToken = default);
}
